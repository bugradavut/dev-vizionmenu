"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("../config");
const logger_1 = require("./logger");
class RedisClient {
    static getInstance() {
        if (!RedisClient.instance) {
            RedisClient.instance = new ioredis_1.default({
                host: config_1.config.redis.host,
                port: config_1.config.redis.port,
                password: config_1.config.redis.password,
                db: config_1.config.redis.db,
                maxRetriesPerRequest: config_1.config.redis.maxRetriesPerRequest,
            });
            RedisClient.instance.on("connect", () => {
                logger_1.logger.info("Redis connected successfully");
            });
            RedisClient.instance.on("error", (error) => {
                logger_1.logger.error("Redis connection error:", error);
            });
            RedisClient.instance.on("close", () => {
                logger_1.logger.warn("Redis connection closed");
            });
            RedisClient.instance.on("reconnecting", () => {
                logger_1.logger.info("Redis reconnecting...");
            });
        }
        return RedisClient.instance;
    }
    static async disconnect() {
        if (RedisClient.instance) {
            await RedisClient.instance.quit();
            logger_1.logger.info("Redis disconnected");
        }
    }
}
exports.RedisClient = RedisClient;
//# sourceMappingURL=redis.js.map