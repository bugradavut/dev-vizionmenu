import { Worker } from "bullmq";
export declare class WorkerManager {
    private static instance;
    private workers;
    private processors;
    private constructor();
    static getInstance(): WorkerManager;
    initialize(): Promise<void>;
    close(): Promise<void>;
    getWorker(queueName: string): Worker | undefined;
    getWorkerStats(): Array<{
        queueName: string;
        isRunning: boolean;
    }>;
    pauseWorker(queueName: string): Promise<void>;
    resumeWorker(queueName: string): Promise<void>;
    pauseAllWorkers(): Promise<void>;
    resumeAllWorkers(): Promise<void>;
}
//# sourceMappingURL=worker-manager.d.ts.map