import IORedis from "ioredis";
import { config } from "../config";
import { logger } from "./logger";

class RedisClient {
  private static instance: IORedis;

  public static getInstance(): IORedis {
    if (!RedisClient.instance) {
      RedisClient.instance = new IORedis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
      });

      RedisClient.instance.on("connect", () => {
        logger.info("Redis connected successfully");
      });

      RedisClient.instance.on("error", (error) => {
        logger.error("Redis connection error:", error);
      });

      RedisClient.instance.on("close", () => {
        logger.warn("Redis connection closed");
      });

      RedisClient.instance.on("reconnecting", () => {
        logger.info("Redis reconnecting...");
      });
    }

    return RedisClient.instance;
  }

  public static async disconnect(): Promise<void> {
    if (RedisClient.instance) {
      await RedisClient.instance.quit();
      logger.info("Redis disconnected");
    }
  }
}

export { RedisClient };
