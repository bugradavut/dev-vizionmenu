"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv = __importStar(require("dotenv"));
dotenv.config();
exports.config = {
    redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || "0", 10),
        maxRetriesPerRequest: null,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
    },
    worker: {
        concurrency: parseInt(process.env.WORKER_CONCURRENCY || "5", 10),
        maxStalledCount: parseInt(process.env.WORKER_MAX_STALLED_COUNT || "3", 10),
        stalledInterval: parseInt(process.env.WORKER_STALLED_INTERVAL || "30000", 10),
        maxFailedAge: parseInt(process.env.WORKER_MAX_FAILED_AGE || "86400000", 10), // 24 hours
        maxCompletedAge: parseInt(process.env.WORKER_MAX_COMPLETED_AGE || "3600000", 10), // 1 hour
    },
    app: {
        nodeEnv: process.env.NODE_ENV || "development",
        logLevel: process.env.LOG_LEVEL || "info",
    },
    // External services (for future use)
    services: {
        email: {
            provider: process.env.EMAIL_PROVIDER || "console", // console, sendgrid, etc.
            apiKey: process.env.EMAIL_API_KEY,
            fromEmail: process.env.EMAIL_FROM || "noreply@vision-menu.com",
        },
        webhooks: {
            secret: process.env.WEBHOOK_SECRET || "dev-secret",
        },
        sync: {
            uberEats: {
                enabled: process.env.UBER_EATS_ENABLED === "true",
                apiKey: process.env.UBER_EATS_API_KEY,
                webhook: process.env.UBER_EATS_WEBHOOK_URL,
            },
            doorDash: {
                enabled: process.env.DOORDASH_ENABLED === "true",
                apiKey: process.env.DOORDASH_API_KEY,
                webhook: process.env.DOORDASH_WEBHOOK_URL,
            },
        },
    },
};
//# sourceMappingURL=index.js.map