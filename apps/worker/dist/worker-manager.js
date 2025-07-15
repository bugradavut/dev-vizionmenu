"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerManager = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("./utils/redis");
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const jobs_1 = require("./types/jobs");
const email_processor_1 = require("./processors/email.processor");
const webhook_processor_1 = require("./processors/webhook.processor");
const sync_processor_1 = require("./processors/sync.processor");
class WorkerManager {
    constructor() {
        this.workers = new Map();
        this.processors = new Map();
        // Initialize processors
        this.processors.set(jobs_1.QUEUES.EMAIL, new email_processor_1.EmailProcessor());
        this.processors.set(jobs_1.QUEUES.WEBHOOK, new webhook_processor_1.WebhookProcessor());
        this.processors.set(jobs_1.QUEUES.SYNC, new sync_processor_1.SyncProcessor());
    }
    static getInstance() {
        if (!WorkerManager.instance) {
            WorkerManager.instance = new WorkerManager();
        }
        return WorkerManager.instance;
    }
    async initialize() {
        const redisConnection = redis_1.RedisClient.getInstance();
        // Create workers for each queue
        for (const [key, queueName] of Object.entries(jobs_1.QUEUES)) {
            const processor = this.processors.get(queueName);
            if (!processor) {
                throw new Error(`No processor found for queue: ${queueName}`);
            }
            const worker = new bullmq_1.Worker(queueName, async (job) => {
                logger_1.logger.info(`Processing job ${job.id} in queue ${queueName}`);
                try {
                    const result = await processor.processJob(job);
                    logger_1.logger.info(`Job ${job.id} completed with result:`, result);
                    return result;
                }
                catch (error) {
                    logger_1.logger.error(`Job ${job.id} failed:`, error);
                    throw error;
                }
            }, {
                connection: redisConnection,
                concurrency: config_1.config.worker.concurrency,
                maxStalledCount: config_1.config.worker.maxStalledCount,
                stalledInterval: config_1.config.worker.stalledInterval,
            });
            // Setup worker events
            worker.on("completed", (job) => {
                logger_1.logger.info(`Worker completed job ${job.id} in queue ${queueName}`);
            });
            worker.on("failed", (job, error) => {
                logger_1.logger.error(`Worker failed job ${job?.id} in queue ${queueName}:`, error);
            });
            worker.on("error", (error) => {
                logger_1.logger.error(`Worker error in queue ${queueName}:`, error);
            });
            worker.on("stalled", (jobId) => {
                logger_1.logger.warn(`Worker stalled job ${jobId} in queue ${queueName}`);
            });
            this.workers.set(queueName, worker);
            logger_1.logger.info(`Worker initialized for queue: ${queueName}`);
        }
        logger_1.logger.info("All workers initialized successfully");
    }
    async close() {
        logger_1.logger.info("Closing all workers...");
        // Close all workers
        for (const [queueName, worker] of this.workers) {
            await worker.close();
            logger_1.logger.info(`Worker closed for queue: ${queueName}`);
        }
        this.workers.clear();
        logger_1.logger.info("All workers closed");
    }
    getWorker(queueName) {
        return this.workers.get(queueName);
    }
    getWorkerStats() {
        return Array.from(this.workers.entries()).map(([queueName, worker]) => ({
            queueName,
            isRunning: worker.isRunning(),
        }));
    }
    async pauseWorker(queueName) {
        const worker = this.workers.get(queueName);
        if (!worker) {
            throw new Error(`Worker not found for queue: ${queueName}`);
        }
        await worker.pause();
        logger_1.logger.info(`Worker paused for queue: ${queueName}`);
    }
    async resumeWorker(queueName) {
        const worker = this.workers.get(queueName);
        if (!worker) {
            throw new Error(`Worker not found for queue: ${queueName}`);
        }
        await worker.resume();
        logger_1.logger.info(`Worker resumed for queue: ${queueName}`);
    }
    async pauseAllWorkers() {
        for (const [queueName, worker] of this.workers) {
            await worker.pause();
            logger_1.logger.info(`Worker paused for queue: ${queueName}`);
        }
        logger_1.logger.info("All workers paused");
    }
    async resumeAllWorkers() {
        for (const [queueName, worker] of this.workers) {
            await worker.resume();
            logger_1.logger.info(`Worker resumed for queue: ${queueName}`);
        }
        logger_1.logger.info("All workers resumed");
    }
}
exports.WorkerManager = WorkerManager;
//# sourceMappingURL=worker-manager.js.map