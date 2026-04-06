import { createClient } from "redis";

const globalForRedis = globalThis as {
  panoramaxRedisClient?: ReturnType<typeof createClient>;
};

function createRedisClient() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL is required to use task monitoring");
  }

  const client = createClient({ url: redisUrl });
  client.on("error", (error) => {
    console.error("Redis client error", error);
  });
  return client;
}

export async function getRedisClient() {
  const client =
    globalForRedis.panoramaxRedisClient ?? createRedisClient();

  if (!globalForRedis.panoramaxRedisClient) {
    globalForRedis.panoramaxRedisClient = client;
  }

  if (!client.isOpen) {
    await client.connect();
  }

  return client;
}
