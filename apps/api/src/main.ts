import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose']
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS configuration
  const allowedOrigins = [
    "http://localhost:3000", // Local development
    "https://dev-vizionmenu.vercel.app", // Production frontend
    process.env.FRONTEND_URL, // Custom frontend URL from env
  ].filter(Boolean); // Remove undefined values

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global prefix for API routes
  app.setGlobalPrefix("api/v1");

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("Vision Menu API")
    .setDescription("Restaurant ordering and management platform API")
    .setVersion("1.0")
    .addBearerAuth()
    .addTag("auth", "Authentication endpoints")
    .addTag("restaurant", "Restaurant management")
    .addTag("menu", "Menu management")
    .addTag("order", "Order management")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Vision Menu API running on: http://localhost:${port}`);
  console.log(
    `📚 Swagger docs available at: http://localhost:${port}/api/docs`,
  );
}

bootstrap();
