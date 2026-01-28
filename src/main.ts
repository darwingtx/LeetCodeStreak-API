import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { Logger, ValidationPipe } from '@nestjs/common';
import { APP_ASCII_LOGO } from './common/constants';

/**
 * Initializes and starts the NestJS application.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure global validation pipes to ensure data integrity
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Apply custom exception filter for unified error handling
  app.useGlobalFilters(new AllExceptionsFilter());
  
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  
  const logger = new Logger('Bootstrap');
  logger.log(`${APP_ASCII_LOGO}\n🚀 Application is running on: http://localhost:${port}\n`);
}

bootstrap();

