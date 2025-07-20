import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { CacheModule } from "@nestjs/cache-manager";
import { APP_FILTER } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { RestaurantModule } from "./modules/restaurant/restaurant.module";
import { MenuModule } from "./modules/menu/menu.module";
import { OrderModule } from "./modules/order/order.module";
import { DatabaseModule } from "./config/database.module";
// import { QueueModule } from "./config/queue.module"; // Redis gerektirir
import { configuration } from "./config/configuration";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [".env.local", ".env"],
    }),

    // Database
    DatabaseModule,

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 1000,
        limit: 10,
      },
      {
        name: "medium",
        ttl: 10000,
        limit: 100,
      },
      {
        name: "long",
        ttl: 60000,
        limit: 1000,
      },
    ]),

    // Caching
    CacheModule.register({
      isGlobal: true,
      ttl: 60000, // 1 minute
    }),

    // Queue (Redis gerektirir - şimdilik devre dışı)
    // QueueModule,

    // Feature modules
    AuthModule,
    UsersModule,
    RestaurantModule,
    MenuModule,
    OrderModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
