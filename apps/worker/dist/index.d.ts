declare class WorkerApp {
    private queueManager;
    private workerManager;
    constructor();
    start(): Promise<void>;
    stop(): Promise<void>;
    private setupGracefulShutdown;
}
export { WorkerApp };
//# sourceMappingURL=index.d.ts.map