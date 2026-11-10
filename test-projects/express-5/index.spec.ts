import { describe, it, expect } from 'vitest';
import { app, errorApp, rawRequests } from './index';
import request from 'supertest';

const expectRes = (res: any) => {
  return expect({ body: res.body, status: res.status });
};

describe('express 5', () => {
  it('should be able to get', async () => {
    const res = await request(app).get('/pokemon/1');

    expectRes(res).toStrictEqual({
      status: 200,
      body: {
        id: 1,
        name: 'Charizard',
      },
    });
  });

  it('should do param validation', async () => {
    const res = await request(app).get('/pokemon/foo');

    expectRes(res).toStrictEqual({
      status: 400,
      body: {
        issues: [
          {
            code: 'invalid_type',
            expected: 'number',
            message: 'Expected number, received nan',
            path: ['id'],
            received: 'nan',
          },
        ],
        name: 'ValidationError',
      },
    });
  });

  it('delete with no body and no return body', async () => {
    const res = await request(app).delete('/pokemon/1');

    expectRes(res).toStrictEqual({
      status: 200,
      body: {},
    });
  });

  it('update', async () => {
    const res = await request(app)
      .patch('/pokemon/1')
      .send({ name: 'pikachu' });

    expectRes(res).toStrictEqual({
      status: 200,
      body: {
        message: 'updated 1 to pikachu',
      },
    });
  });
});

it('preserves native raw channels through middleware and transformed handlers', async () => {
  rawRequests.length = 0;
  const result = await request(app)
    .post('/raw/2026-11-10?count=3&repeat=one&repeat=two&nested[key]=value')
    .set('X-Count', '7')
    .send({ value: '12' });
  expect(result.status).toBe(200);
  expect(result.body).toEqual({
    date: '2026-11-10T00:00:00.000Z',
    optional: 5,
    count: 3,
    limit: 10,
    headerCount: 7,
    headerDefault: 'fallback',
    value: 12,
  });
  expect(rawRequests.map((snapshot) => snapshot.stage)).toEqual([
    'global',
    'route',
    'handler',
  ]);
  for (const snapshot of rawRequests) {
    expect(snapshot.params).toMatchObject({ date: '2026-11-10' });
    expect(snapshot.params).not.toHaveProperty('optional', '5');
    expect(snapshot.query).toEqual({
      count: '3',
      repeat: ['one', 'two'],
      nested: { key: 'value' },
    });
    expect(snapshot.headers).toMatchObject({ 'x-count': '7' });
    expect(snapshot.headers).not.toHaveProperty('X-Count');
    expect(snapshot.headers).not.toHaveProperty('x-default');
    expect(snapshot.body).toEqual({ value: '12' });
  }
});

it('runs raw middleware for invalid JSON fields before validation', async () => {
  rawRequests.length = 0;
  const result = await request(app)
    .post('/raw/2026-11-10?count=3')
    .set('X-Count', '7')
    .send({ value: 12 });
  expect(result.status).toBe(400);
  expect(rawRequests.map((snapshot) => snapshot.stage)).toEqual([
    'global',
    'route',
  ]);
  expect(rawRequests.map((snapshot) => snapshot.body)).toEqual([
    { value: 12 },
    { value: 12 },
  ]);
});

it('allows cleared native params in validation-error callbacks', async () => {
  rawRequests.length = 0;
  const result = await request(errorApp)
    .post('/raw/2026-11-10?count=3')
    .set('X-Count', '7')
    .send({ value: 12 });
  expect(result.status).toBe(400);
  expect(result.body).toEqual({
    params: {},
    body: { value: 12 },
    route: '/raw/:date/:optional?',
  });
  expect(rawRequests.map((snapshot) => snapshot.stage)).toEqual([
    'global',
    'route',
    'error',
  ]);
  expect(rawRequests.slice(0, 2).map((snapshot) => snapshot.params)).toEqual([
    { date: '2026-11-10' },
    { date: '2026-11-10' },
  ]);
  expect(rawRequests[2].params).toEqual({});
});
