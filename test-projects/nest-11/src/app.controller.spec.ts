import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';

describe('AppController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('root', () => {
    it('rejects requests through native method guards added after TsRestHandler', () => {
      return request(app.getHttpServer())
        .get('/')
        .set('x-deny', 'yes')
        .expect(403);
    });

    it('should return "Hello from Nest 11!"', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello from Nest 11!');
    });
  });
});
