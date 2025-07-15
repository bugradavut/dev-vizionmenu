"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerApp = void 0;
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const redis_1 = require("./utils/redis");
const queue_manager_1 = require("./queues/queue-manager");
const worker_manager_1 = require("./worker-manager");
class WorkerApp {
    constructor() {
        this.queueManager = queue_manager_1.QueueManager.getInstance();
        this.workerManager = worker_manager_1.WorkerManager.getInstance();
    }
    async start() {
        try {
            logger_1.logger.info("Starting Vision Menu Worker...");
            // Initialize Redis connection
            const redis = redis_1.RedisClient.getInstance();
            logger_1.logger.info("Redis connection initialized");
            // Initialize queues
            await this.queueManager.initialize();
            logger_1.logger.info("Queues initialized");
            // Initialize workers
            await this.workerManager.initialize();
            logger_1.logger.info("Workers initialized");
            // Setup graceful shutdown
            this.setupGracefulShutdown();
            logger_1.logger.info("Vision Menu Worker started successfully");
            logger_1.logger.info(`Worker running in ${config_1.config.app.nodeEnv} mode`);
            logger_1.logger.info(`Worker concurrency: ${config_1.config.worker.concurrency}`);
            logger_1.logger.info(`Redis host: ${config_1.config.redis.host}:${config_1.config.redis.port}`);
            // Log worker stats
            const workerStats = this.workerManager.getWorkerStats();
            logger_1.logger.info("Worker status:", workerStats);
        }
        catch (error) {
            logger_1.logger.error("Failed to start worker:", error);
            process.exit(1);
        }
    }
    async stop() {
        try {
            logger_1.logger.info("Stopping Vision Menu Worker...");
            // Close workers
            await this.workerManager.close();
            logger_1.logger.info("Workers closed");
            // Close queues
            await this.queueManager.close();
            logger_1.logger.info("Queues closed");
            logger_1.logger.info("Vision Menu Worker stopped successfully");
        }
        catch (error) {
            logger_1.logger.error("Error stopping worker:", error);
            throw error;
        }
    }
    setupGracefulShutdown() {
        const gracefulShutdown = async (signal) => {
            logger_1.logger.info(`Received ${signal}, shutting down gracefully...`);
            try {
                await this.stop();
                process.exit(0);
            }
            catch (error) {
                logger_1.logger.error("Error during graceful shutdown:", error);
                process.exit(1);
            }
        };
        // Handle different termination signals
        process.on("SIGINT", () => gracefulShutdown("SIGINT"));
        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
        process.on("SIGQUIT", () => gracefulShutdown("SIGQUIT"));
        // Handle uncaught errors
        process.on("uncaughtException", (error) => {
            logger_1.logger.error("Uncaught Exception:", error);
            gracefulShutdown("uncaughtException");
        });
        process.on("unhandledRejection", (reason, promise) => {
            logger_1.logger.error("Unhandled Rejection at:", promise, "reason:", reason);
            gracefulShutdown("unhandledRejection");
        });
    }
}
exports.WorkerApp = WorkerApp;
// Create and start the worker application
const app = new WorkerApp();
async function main() {
    try {
        await app.start();
    }
    catch (error) {
        logger_1.logger.error("Worker failed to start:", error);
        process.exit(1);
    }
}
// Start the application
main().catch((error) => {
    logger_1.logger.error("Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map