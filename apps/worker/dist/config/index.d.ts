export declare const config: {
    redis: {
        host: string;
        port: number;
        password: string | undefined;
        db: number;
        maxRetriesPerRequest: null;
        retryDelayOnFailover: number;
        enableReadyCheck: boolean;
    };
    worker: {
        concurrency: number;
        maxStalledCount: number;
        stalledInterval: number;
        maxFailedAge: number;
        maxCompletedAge: number;
    };
    app: {
        nodeEnv: string;
        logLevel: string;
    };
    services: {
        email: {
            provider: string;
            apiKey: string | undefined;
            fromEmail: string;
        };
        webhooks: {
            secret: string;
        };
        sync: {
            uberEats: {
                enabled: boolean;
                apiKey: string | undefined;
                webhook: string | undefined;
            };
            doorDash: {
                enabled: boolean;
                apiKey: string | undefined;
                webhook: string | undefined;
            };
        };
    };
};
//# sourceMappingURL=index.d.ts.map