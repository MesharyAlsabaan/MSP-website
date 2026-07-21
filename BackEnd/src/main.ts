import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  const prefix = config.get<string>('apiPrefix', 'api');
  app.setGlobalPrefix(prefix);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({ origin: config.get<string[]>('corsOrigin'), credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // Serve uploaded files at /<prefix>/uploads/<file>
  app.useStaticAssets(
    join(process.cwd(), config.get<string>('upload.dir', 'uploads')),
    { prefix: `/${prefix}/uploads/` },
  );

  // Swagger at /<prefix>/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MSP Design API')
    .setDescription('REST API for the MSP Design website and admin CMS')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${prefix}/docs`, app, document);

  const port = config.get<number>('port', 3000);
  // '::' binds IPv4 + IPv6 — required for Railway private networking.
  await app.listen(port, '::');
  // eslint-disable-next-line no-console
  console.log(`MSP API running on http://localhost:${port}/${prefix}`);
  // eslint-disable-next-line no-console
  console.log(`Swagger docs at http://localhost:${port}/${prefix}/docs`);
}
bootstrap();
