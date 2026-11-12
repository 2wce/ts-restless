import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { apiBlog } from '@ts-restless/example-contracts';
import { generateOpenApi } from '@ts-restless/open-api/legacy';
import cors from 'cors';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3334;

  app.use(cors());

  SwaggerModule.setup(
    'api',
    app,
    generateOpenApi(apiBlog, {
      info: { title: 'Blog API', version: '0.1' },
    }),
  );

  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}`);
}

bootstrap();
