import { config } from "./config";
import { logger } from "./utils/logger";
import { RedisClient } from "./utils/redis";
import { QueueManager } from "./queues/queue-manager";
import { WorkerManager } from "./worker-manager";

class WorkerApp {
  private queueManager: QueueManager;
  private workerManager: WorkerManager;

  constructor() {
    this.queueManager = QueueManager.getInstance();
    this.workerManager = WorkerManager.getInstance();
  }

  async start(): Promise<void> {
    try {
      logger.info("Starting Vision Menu Worker...");

      // Initialize Redis connection
      const redis = RedisClient.getInstance();
      logger.info("Redis connection initialized");

      // Initialize queues
      await this.queueManager.initialize();
      logger.info("Queues initialized");

      // Initialize workers
      await this.workerManager.initialize();
      logger.info("Workers initialized");

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      logger.info("Vision Menu Worker started successfully");
      logger.info(`Worker running in ${config.app.nodeEnv} mode`);
      logger.info(`Worker concurrency: ${config.worker.concurrency}`);
      logger.info(`Redis host: ${config.redis.host}:${config.redis.port}`);

      // Log worker stats
      const workerStats = this.workerManager.getWorkerStats();
      logger.info("Worker status:", workerStats);
    } catch (error) {
      logger.error("Failed to start worker:", error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    try {
      logger.info("Stopping Vision Menu Worker...");

      // Close workers
      await this.workerManager.close();
      logger.info("Workers closed");

      // Close queues
      await this.queueManager.close();
      logger.info("Queues closed");

      logger.info("Vision Menu Worker stopped successfully");
    } catch (error) {
      logger.error("Error stopping worker:", error);
      throw error;
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        logger.error("Error during graceful shutdown:", error);
        process.exit(1);
      }
    };

    // Handle different termination signals
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGQUIT", () => gracefulShutdown("SIGQUIT"));

    // Handle uncaught errors
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception:", error);
      gracefulShutdown("uncaughtException");
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection at:", promise, "reason:", reason);
      gracefulShutdown("unhandledRejection");
    });
  }
}

// Create and start the worker application
const app = new WorkerApp();

async function main() {
  try {
    await app.start();
  } catch (error) {
    logger.error("Worker failed to start:", error);
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});

export { WorkerApp };
