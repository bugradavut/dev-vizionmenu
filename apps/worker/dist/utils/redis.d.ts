import IORedis from "ioredis";
declare class RedisClient {
    private static instance;
    static getInstance(): IORedis;
    static disconnect(): Promise<void>;
}
export { RedisClient };
//# sourceMappingURL=redis.d.ts.map