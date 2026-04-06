import "dotenv/config";
import { getRedisClient } from "../lib/redis.js";
import taskMonitorService from "../services/task-monitor.service.js";

const TASK_TYPE = "sources:ingest-all-pages";
const ACTIVE_TASK_KEY = `panoramax:tasks:active:${TASK_TYPE}`;

type InspectOutput = {
  inspectedAt: string;
  taskType: string;
  activeLock: {
    key: string;
    taskId: string | null;
    ttlMs: number | null;
    ttlSeconds: number | null;
  };
  activeTask: {
    id: string;
    status: string;
    createdAt: string;
    startedAt: string | null;
    heartbeatAt: string | null;
    heartbeatAgeMs: number | null;
    finishedAt: string | null;
    error: string | null;
    outputCount: number;
  } | null;
  recentTasks: Array<{
    id: string;
    status: string;
    createdAt: string;
    startedAt: string | null;
    heartbeatAt: string | null;
    heartbeatAgeMs: number | null;
    finishedAt: string | null;
    error: string | null;
    outputCount: number;
  }>;
};

function getHeartbeatAgeMs(heartbeatAt: string | null) {
  if (!heartbeatAt) {
    return null;
  }

  return Date.now() - new Date(heartbeatAt).getTime();
}

async function main() {
  const redis = await getRedisClient();
  const [activeTaskId, ttlMs, recentTasks] = await Promise.all([
    redis.get(ACTIVE_TASK_KEY),
    redis.pTTL(ACTIVE_TASK_KEY),
    taskMonitorService.listTasks<unknown, unknown[]>(10, TASK_TYPE),
  ]);

  const activeTask = activeTaskId
    ? await taskMonitorService.getTask<unknown, unknown[]>(activeTaskId)
    : null;

  const output: InspectOutput = {
    inspectedAt: new Date().toISOString(),
    taskType: TASK_TYPE,
    activeLock: {
      key: ACTIVE_TASK_KEY,
      taskId: activeTaskId,
      ttlMs: ttlMs >= 0 ? ttlMs : null,
      ttlSeconds: ttlMs >= 0 ? Math.ceil(ttlMs / 1000) : null,
    },
    activeTask: activeTask
      ? {
          id: activeTask.id,
          status: activeTask.status,
          createdAt: activeTask.createdAt,
          startedAt: activeTask.startedAt,
          heartbeatAt: activeTask.heartbeatAt,
          heartbeatAgeMs: getHeartbeatAgeMs(activeTask.heartbeatAt),
          finishedAt: activeTask.finishedAt,
          error: activeTask.error,
          outputCount: Array.isArray(activeTask.output)
            ? activeTask.output.length
            : 0,
        }
      : null,
    recentTasks: recentTasks.map((task) => ({
      id: task.id,
      status: task.status,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      heartbeatAt: task.heartbeatAt,
      heartbeatAgeMs: getHeartbeatAgeMs(task.heartbeatAt),
      finishedAt: task.finishedAt,
      error: task.error,
      outputCount: Array.isArray(task.output) ? task.output.length : 0,
    })),
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
