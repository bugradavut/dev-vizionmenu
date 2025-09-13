import { Worker } from "bullmq";
import { RedisClient } from "./utils/redis";
import { config } from "./config";
import { logger } from "./utils/logger";
import { QUEUES } from "./types/jobs";
import { EmailProcessor } from "./processors/email.processor";
import { WebhookProcessor } from "./processors/webhook.processor";
import { SyncProcessor } from "./processors/sync.processor";

export class WorkerManager {
  private static instance: WorkerManager;
  private workers: Map<string, Worker> = new Map();
  private processors: Map<string, any> = new Map();

  private constructor() {
    // Initialize processors
    this.processors.set(QUEUES.EMAIL, new EmailProcessor());
    this.processors.set(QUEUES.WEBHOOK, new WebhookProcessor());
    this.processors.set(QUEUES.SYNC, new SyncProcessor());
  }

  public static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager();
    }
    return WorkerManager.instance;
  }

  public async initialize(): Promise<void> {
    const redisConnection = RedisClient.getInstance();

    // Create workers for each queue
    for (const [key, queueName] of Object.entries(QUEUES)) {
      const processor = this.processors.get(queueName);
      if (!processor) {
        throw new Error(`No processor found for queue: ${queueName}`);
      }

      const worker = new Worker(
        queueName,
        async (job) => {
          logger.info(`Processing job ${job.id} in queue ${queueName}`);

          try {
            const result = await processor.processJob(job);
            logger.info(`Job ${job.id} completed with result:`, result);
            return result;
          } catch (error) {
            logger.error(`Job ${job.id} failed:`, error);
            throw error;
          }
        },
        {
          connection: redisConnection,
          concurrency: config.worker.concurrency,
          maxStalledCount: config.worker.maxStalledCount,
          stalledInterval: config.worker.stalledInterval,
        },
      );

      // Setup worker events
      worker.on("completed", (job) => {
        logger.info(`Worker completed job ${job.id} in queue ${queueName}`);
      });

      worker.on("failed", (job, error) => {
        logger.error(
          `Worker failed job ${job?.id} in queue ${queueName}:`,
          error,
        );
      });

      worker.on("error", (error) => {
        logger.error(`Worker error in queue ${queueName}:`, error);
      });

      worker.on("stalled", (jobId) => {
        logger.warn(`Worker stalled job ${jobId} in queue ${queueName}`);
      });

      this.workers.set(queueName, worker);
      logger.info(`Worker initialized for queue: ${queueName}`);
    }

    logger.info("All workers initialized successfully");
  }

  public async close(): Promise<void> {
    logger.info("Closing all workers...");

    // Close all workers
    for (const [queueName, worker] of this.workers) {
      await worker.close();
      logger.info(`Worker closed for queue: ${queueName}`);
    }

    this.workers.clear();
    logger.info("All workers closed");
  }

  public getWorker(queueName: string): Worker | undefined {
    return this.workers.get(queueName);
  }

  public getWorkerStats(): Array<{ queueName: string; isRunning: boolean }> {
    return Array.from(this.workers.entries()).map(([queueName, worker]) => ({
      queueName,
      isRunning: worker.isRunning(),
    }));
  }

  public async pauseWorker(queueName: string): Promise<void> {
    const worker = this.workers.get(queueName);
    if (!worker) {
      throw new Error(`Worker not found for queue: ${queueName}`);
    }

    await worker.pause();
    logger.info(`Worker paused for queue: ${queueName}`);
  }

  public async resumeWorker(queueName: string): Promise<void> {
    const worker = this.workers.get(queueName);
    if (!worker) {
      throw new Error(`Worker not found for queue: ${queueName}`);
    }

    await worker.resume();
    logger.info(`Worker resumed for queue: ${queueName}`);
  }

  public async pauseAllWorkers(): Promise<void> {
    for (const [queueName, worker] of this.workers) {
      await worker.pause();
      logger.info(`Worker paused for queue: ${queueName}`);
    }
    logger.info("All workers paused");
  }

  public async resumeAllWorkers(): Promise<void> {
    for (const [queueName, worker] of this.workers) {
      await worker.resume();
      logger.info(`Worker resumed for queue: ${queueName}`);
    }
    logger.info("All workers resumed");
  }
}
