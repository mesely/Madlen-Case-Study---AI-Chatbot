import { otelSDK } from './tracing'; 
import { NestFactory } from '@nestjs/core';
import { AppModule } from './chat/chat.module';
import { json, urlencoded } from 'express'; // 1. Bu satırı ekle

async function bootstrap() {
  // Start tracing before the application starts
  await otelSDK.start();

  const app = await NestFactory.create(AppModule);
  
  // 2. Bu iki satırı ekleyerek limiti artır (Resimler için gerekli)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Enable CORS for frontend communication
  app.enableCors();
  
  const port = 3001;
  await app.listen(port);
  console.log(`Backend running on: http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});