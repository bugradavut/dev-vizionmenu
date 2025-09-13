import { Queue, QueueEvents } from "bullmq";
import { RedisClient } from "../utils/redis";
import { config } from "../config";
import { logger } from "../utils/logger";
import { QUEUES, JobOptions } from "../types/jobs";

export class QueueManager {
  private static instance: QueueManager;
  private queues: Map<string, Queue> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();

  private constructor() {}

  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  public async initialize(): Promise<void> {
    const redisConnection = RedisClient.getInstance();

    // Create queues
    for (const [key, queueName] of Object.entries(QUEUES)) {
      const queue = new Queue(queueName, {
        connection: redisConnection,
        defaultJobOptions: {
          removeOnComplete: config.worker.maxCompletedAge,
          removeOnFail: config.worker.maxFailedAge,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      });

      this.queues.set(queueName, queue);

      // Setup queue events
      const queueEvents = new QueueEvents(queueName, {
        connection: redisConnection,
      });

      queueEvents.on("completed", ({ jobId }) => {
        logger.info(`Job ${jobId} completed in queue ${queueName}`);
      });

      queueEvents.on("failed", ({ jobId, failedReason }) => {
        logger.error(
          `Job ${jobId} failed in queue ${queueName}:`,
          failedReason,
        );
      });

      queueEvents.on("stalled", ({ jobId }) => {
        logger.warn(`Job ${jobId} stalled in queue ${queueName}`);
      });

      this.queueEvents.set(queueName, queueEvents);
      logger.info(`Initialized queue: ${queueName}`);
    }
  }

  public getQueue(queueName: string): Queue | undefined {
    return this.queues.get(queueName);
  }

  public async addJob(
    queueName: string,
    jobType: string,
    jobData: any,
    options?: JobOptions,
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.add(jobType, jobData, options);
    logger.info(`Job ${jobType} added to queue ${queueName}`);
  }

  public async getQueueStats(queueName: string) {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  public async clearQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.obliterate({ force: true });
    logger.info(`Queue ${queueName} cleared`);
  }

  public async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();
    logger.info(`Queue ${queueName} paused`);
  }

  public async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();
    logger.info(`Queue ${queueName} resumed`);
  }

  public async close(): Promise<void> {
    // Close all queues
    for (const [queueName, queue] of this.queues) {
      await queue.close();
      logger.info(`Queue ${queueName} closed`);
    }

    // Close all queue events
    for (const [queueName, queueEvents] of this.queueEvents) {
      await queueEvents.close();
      logger.info(`Queue events ${queueName} closed`);
    }

    await RedisClient.disconnect();
  }
}
