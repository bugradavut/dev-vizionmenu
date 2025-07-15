import { Queue } from "bullmq";
import { JobOptions } from "../types/jobs";
export declare class QueueManager {
    private static instance;
    private queues;
    private queueEvents;
    private constructor();
    static getInstance(): QueueManager;
    initialize(): Promise<void>;
    getQueue(queueName: string): Queue | undefined;
    addJob(queueName: string, jobType: string, jobData: any, options?: JobOptions): Promise<void>;
    getQueueStats(queueName: string): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
    }>;
    clearQueue(queueName: string): Promise<void>;
    pauseQueue(queueName: string): Promise<void>;
    resumeQueue(queueName: string): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=queue-manager.d.ts.map