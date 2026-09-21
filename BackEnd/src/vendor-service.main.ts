import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { SafeLoggingInterceptor } from './common/interceptors/safe-logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { VendorServiceModule } from './vendor-service/vendor-service.module';

/**
 * Entry point of the OFFICE vendor service (`npm run vendor:start:prod`).
 * Runs inside the office network; the website reaches it through a
 * Cloudflare Tunnel. Nothing it serves may be cached, and nothing it logs
 * may contain tokens or vendor data.
 */
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(VendorServiceModule);
  const config = app.get(ConfigService);
  const prefix = config.get<string>('apiPrefix', 'api');
  app.setGlobalPrefix(prefix);

  // One hop of proxy (cloudflared) in front: trust it for the client IP used by throttling.
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.enableCors({ origin: config.get<string[]>('corsOrigin'), credentials: false });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
  app.useGlobalInterceptors(new SafeLoggingInterceptor(), new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  if (config.get<string>('env') !== 'production') {
    const swagger = new DocumentBuilder().setTitle('MSP Vendor Service').setVersion('1.0').addBearerAuth().build();
    SwaggerModule.setup(`${prefix}/docs`, app, SwaggerModule.createDocument(app, swagger));
  }

  const port = config.get<number>('port', 3100);
  const host = process.env.LISTEN_HOST ?? '127.0.0.1'; // cloudflared connects locally; nothing else should
  await app.listen(port, host);
  // eslint-disable-next-line no-console
  console.log(`MSP Vendor Service listening on http://${host}:${port}/${prefix} (env=${config.get('env')})`);
}
bootstrap();
