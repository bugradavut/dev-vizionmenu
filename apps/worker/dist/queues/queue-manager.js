"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManager = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../utils/redis");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const jobs_1 = require("../types/jobs");
class QueueManager {
    constructor() {
        this.queues = new Map();
        this.queueEvents = new Map();
    }
    static getInstance() {
        if (!QueueManager.instance) {
            QueueManager.instance = new QueueManager();
        }
        return QueueManager.instance;
    }
    async initialize() {
        const redisConnection = redis_1.RedisClient.getInstance();
        // Create queues
        for (const [key, queueName] of Object.entries(jobs_1.QUEUES)) {
            const queue = new bullmq_1.Queue(queueName, {
                connection: redisConnection,
                defaultJobOptions: {
                    removeOnComplete: config_1.config.worker.maxCompletedAge,
                    removeOnFail: config_1.config.worker.maxFailedAge,
                    attempts: 3,
                    backoff: {
                        type: "exponential",
                        delay: 2000,
                    },
                },
            });
            this.queues.set(queueName, queue);
            // Setup queue events
            const queueEvents = new bullmq_1.QueueEvents(queueName, {
                connection: redisConnection,
            });
            queueEvents.on("completed", ({ jobId }) => {
                logger_1.logger.info(`Job ${jobId} completed in queue ${queueName}`);
            });
            queueEvents.on("failed", ({ jobId, failedReason }) => {
                logger_1.logger.error(`Job ${jobId} failed in queue ${queueName}:`, failedReason);
            });
            queueEvents.on("stalled", ({ jobId }) => {
                logger_1.logger.warn(`Job ${jobId} stalled in queue ${queueName}`);
            });
            this.queueEvents.set(queueName, queueEvents);
            logger_1.logger.info(`Initialized queue: ${queueName}`);
        }
    }
    getQueue(queueName) {
        return this.queues.get(queueName);
    }
    async addJob(queueName, jobType, jobData, options) {
        const queue = this.getQueue(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }
        await queue.add(jobType, jobData, options);
        logger_1.logger.info(`Job ${jobType} added to queue ${queueName}`);
    }
    async getQueueStats(queueName) {
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
    async clearQueue(queueName) {
        const queue = this.getQueue(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }
        await queue.obliterate({ force: true });
        logger_1.logger.info(`Queue ${queueName} cleared`);
    }
    async pauseQueue(queueName) {
        const queue = this.getQueue(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }
        await queue.pause();
        logger_1.logger.info(`Queue ${queueName} paused`);
    }
    async resumeQueue(queueName) {
        const queue = this.getQueue(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }
        await queue.resume();
        logger_1.logger.info(`Queue ${queueName} resumed`);
    }
    async close() {
        // Close all queues
        for (const [queueName, queue] of this.queues) {
            await queue.close();
            logger_1.logger.info(`Queue ${queueName} closed`);
        }
        // Close all queue events
        for (const [queueName, queueEvents] of this.queueEvents) {
            await queueEvents.close();
            logger_1.logger.info(`Queue events ${queueName} closed`);
        }
        await redis_1.RedisClient.disconnect();
    }
}
exports.QueueManager = QueueManager;
//# sourceMappingURL=queue-manager.js.map