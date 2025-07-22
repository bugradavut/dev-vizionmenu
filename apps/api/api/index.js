// Vercel Serverless Function Entry Point for NestJS
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/main');

let app;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log']
    });
    
    // Enable CORS for frontend
    app.enableCors({
      origin: [
        'https://dev-vizionmenu.vercel.app',
        'http://localhost:3000'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    });
    
    // Global prefix for API routes
    app.setGlobalPrefix('api/v1');
    
    await app.init();
  }
  return app;
}

module.exports = async (req, res) => {
  try {
    const nestApp = await bootstrap();
    const expressApp = nestApp.getHttpAdapter().getInstance();
    return expressApp(req, res);
  } catch (error) {
    console.error('Vercel serverless error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};