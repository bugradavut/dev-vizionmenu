import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { QueueService } from "./queue.service";

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get("REDIS_HOST", "localhost"),
          port: configService.get("REDIS_PORT", 6379),
          password: configService.get("REDIS_PASSWORD"),
          db: configService.get("REDIS_DB", 0),
          maxRetriesPerRequest: null,
        },
      }),
    }),
    // Register the queues
    BullModule.registerQueue(
      { name: "email-queue" },
      { name: "webhook-queue" },
      { name: "sync-queue" },
      { name: "notification-queue" },
    ),
  ],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
