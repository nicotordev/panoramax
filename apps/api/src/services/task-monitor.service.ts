import { randomUUID } from "node:crypto";
import { getRedisClient } from "../lib/redis.js";

export type TaskStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "stale";

function isTerminalStatus(status: TaskStatus) {
  return status === "succeeded" || status === "failed" || status === "stale";
}

export type TaskRecord<TInput = unknown, TOutput = unknown> = {
  id: string;
  type: string;
  status: TaskStatus;
  createdAt: string;
  startedAt: string | null;
  heartbeatAt: string | null;
  finishedAt: string | null;
  input: TInput | null;
  output: TOutput | null;
  error: string | null;
};

const TASK_KEY_PREFIX = "panoramax:task:";
const TASK_INDEX_KEY = "panoramax:tasks:index";
const ACTIVE_TASK_KEY_PREFIX = "panoramax:tasks:active:";
const TASK_TTL_SECONDS = 60 * 60 * 24 * 7;
const ACTIVE_LOCK_TTL_SECONDS = 60 * 30;
const STALE_AFTER_MS = ACTIVE_LOCK_TTL_SECONDS * 1000;

function taskKey(taskId: string) {
  return `${TASK_KEY_PREFIX}${taskId}`;
}

function activeTaskKey(taskType: string) {
  return `${ACTIVE_TASK_KEY_PREFIX}${taskType}`;
}

async function writeTask<TInput, TOutput>(task: TaskRecord<TInput, TOutput>) {
  const redis = await getRedisClient();
  await redis.set(taskKey(task.id), JSON.stringify(task), {
    EX: TASK_TTL_SECONDS,
  });
  await redis.zAdd(TASK_INDEX_KEY, [{ score: Date.now(), value: task.id }]);
  await redis.zRemRangeByRank(TASK_INDEX_KEY, 0, -201);
}

function parseTask<TInput, TOutput>(
  raw: string | null,
): TaskRecord<TInput, TOutput> | null {
  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as TaskRecord<TInput, TOutput>;
}

class TaskMonitorService {
  public async startExclusiveTask<TInput, TOutput>(
    taskType: string,
    input: TInput,
  ) {
    const redis = await getRedisClient();
    const id = randomUUID();
    const activeKey = activeTaskKey(taskType);
    const acquired = await redis.set(activeKey, id, {
      NX: true,
      EX: ACTIVE_LOCK_TTL_SECONDS,
    });

    if (acquired !== "OK") {
      const activeTaskId = await redis.get(activeKey);
      const activeTask = activeTaskId
        ? await this.getTask<TInput, TOutput>(activeTaskId)
        : null;
      return {
        started: false as const,
        task: activeTask,
      };
    }

    const task: TaskRecord<TInput, TOutput> = {
      id,
      type: taskType,
      status: "queued",
      createdAt: new Date().toISOString(),
      startedAt: null,
      heartbeatAt: null,
      finishedAt: null,
      input,
      output: null,
      error: null,
    };

    await writeTask(task);

    return {
      started: true as const,
      task,
    };
  }

  public async markRunning<TInput, TOutput>(taskId: string) {
    const task = await this.getTask<TInput, TOutput>(taskId);
    if (!task) {
      return null;
    }
    if (isTerminalStatus(task.status)) {
      return task;
    }

    const now = new Date().toISOString();
    const updated: TaskRecord<TInput, TOutput> = {
      ...task,
      status: "running",
      startedAt: task.startedAt ?? now,
      heartbeatAt: now,
    };

    await writeTask(updated);
    await this.refreshLock(updated.type, updated.id);

    return updated;
  }

  public async markHeartbeat<TInput, TOutput>(
    taskId: string,
    output: TOutput | null,
  ) {
    const task = await this.getTask<TInput, TOutput>(taskId);
    if (!task) {
      return null;
    }
    if (isTerminalStatus(task.status)) {
      return task;
    }

    const updated: TaskRecord<TInput, TOutput> = {
      ...task,
      status: "running",
      heartbeatAt: new Date().toISOString(),
      output,
    };

    await writeTask(updated);
    await this.refreshLock(updated.type, updated.id);

    return updated;
  }

  public async markSucceeded<TInput, TOutput>(
    taskId: string,
    output: TOutput,
  ) {
    const task = await this.getTask<TInput, TOutput>(taskId);
    if (!task) {
      return null;
    }
    if (isTerminalStatus(task.status)) {
      return task;
    }

    const now = new Date().toISOString();
    const updated: TaskRecord<TInput, TOutput> = {
      ...task,
      status: "succeeded",
      heartbeatAt: now,
      finishedAt: now,
      output,
      error: null,
    };

    await writeTask(updated);
    await this.releaseLock(updated.type, updated.id);

    return updated;
  }

  public async markFailed<TInput, TOutput>(taskId: string, error: string) {
    const task = await this.getTask<TInput, TOutput>(taskId);
    if (!task) {
      return null;
    }
    if (isTerminalStatus(task.status)) {
      return task;
    }

    const now = new Date().toISOString();
    const updated: TaskRecord<TInput, TOutput> = {
      ...task,
      status: "failed",
      heartbeatAt: now,
      finishedAt: now,
      error,
    };

    await writeTask(updated);
    await this.releaseLock(updated.type, updated.id);

    return updated;
  }

  public async getTask<TInput, TOutput>(taskId: string) {
    const redis = await getRedisClient();
    const task = parseTask<TInput, TOutput>(await redis.get(taskKey(taskId)));
    if (!task) {
      return null;
    }

    if (task.status === "running" && task.heartbeatAt) {
      const age = Date.now() - new Date(task.heartbeatAt).getTime();
      if (age > STALE_AFTER_MS) {
        const activeTaskId = await redis.get(activeTaskKey(task.type));
        if (activeTaskId !== task.id) {
          const staleTask: TaskRecord<TInput, TOutput> = {
            ...task,
            status: "stale",
            finishedAt: task.finishedAt ?? new Date().toISOString(),
            error: task.error ?? "Task heartbeat expired",
          };
          await writeTask(staleTask);
          return staleTask;
        }
      }
    }

    return task;
  }

  public async listTasks<TInput, TOutput>(limit = 20, taskType?: string) {
    const redis = await getRedisClient();
    const taskIds = await redis.zRange(TASK_INDEX_KEY, 0, limit * 5, {
      REV: true,
    });

    const tasks = (
      await Promise.all(
        taskIds.map((taskId) => this.getTask<TInput, TOutput>(taskId)),
      )
    ).filter(
      (task): task is TaskRecord<TInput, TOutput> => task !== null,
    );

    return tasks
      .filter((task) => (taskType ? task.type === taskType : true))
      .slice(0, limit);
  }

  private async refreshLock(taskType: string, taskId: string) {
    const redis = await getRedisClient();
    const activeKey = activeTaskKey(taskType);
    const activeTaskId = await redis.get(activeKey);
    if (activeTaskId === taskId) {
      await redis.expire(activeKey, ACTIVE_LOCK_TTL_SECONDS);
    }
  }

  private async releaseLock(taskType: string, taskId: string) {
    const redis = await getRedisClient();
    const activeKey = activeTaskKey(taskType);
    const activeTaskId = await redis.get(activeKey);
    if (activeTaskId === taskId) {
      await redis.del(activeKey);
    }
  }
}

const taskMonitorService = new TaskMonitorService();

export default taskMonitorService;
