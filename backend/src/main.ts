import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  let port = parseInt(process.env.PORT ?? '3000', 10);
  const maxTries = 10;
  let currentTry = 0;

  while (currentTry < maxTries) {
    try {
      await app.listen(port);
      console.log(`Application successfully started and listening on: http://localhost:${port}`);
      break;
    } catch (err: any) {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Port ${port} is in use, trying next port...`);
        port++;
        currentTry++;
      } else {
        throw err;
      }
    }
  }
}
bootstrap();
