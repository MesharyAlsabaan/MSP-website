import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { basename, join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { VARIANT_DIR, scheduleVariants, variantFallback } from './modules/uploads/image-variants';

const variantLog = new Logger('ImageVariants');

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

  const uploadDir = join(process.cwd(), config.get<string>('upload.dir', 'uploads'));

  // Responsive web copies at /<prefix>/uploads/_w/<name>.<width>.webp. A copy
  // is immutable (its name is derived from an original that is never
  // overwritten), so it is cached for a year. When a width has no copy (the
  // original is too narrow, or not processed yet) the original is sent with a
  // short cache, so a later backfill takes effect.
  app.use(`/${prefix}/uploads/${VARIANT_DIR}`, (req: Request, res: Response, next: NextFunction) => {
    const hit = variantFallback(uploadDir, req.path.replace(/^\//, ''));
    if (!hit) return next();
    // No copy yet: serve the original now and create the copies in the
    // background, so the site heals itself without a manual backfill.
    if (!hit.isCopy) {
      scheduleVariants(uploadDir, basename(hit.path), (err) =>
        variantLog.warn(`Could not create web copies of ${basename(hit.path)}: ${(err as Error).message}`),
      );
    }
    res.sendFile(hit.path, {
      headers: {
        'Cache-Control': hit.isCopy ? 'public, max-age=31536000, immutable' : 'public, max-age=86400',
      },
    });
  });

  // Serve uploaded files at /<prefix>/uploads/<file>
  app.useStaticAssets(uploadDir, { prefix: `/${prefix}/uploads/` });

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
