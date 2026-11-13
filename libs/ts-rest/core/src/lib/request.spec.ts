import { describe, expect, it } from 'vitest';
import {
  AppRoute,
  evaluateRequest,
  evaluateRequestPart,
  initContract,
  StandardSchemaV1,
} from '../index';

const c = initContract();

describe('parsed request evaluation', () => {
  it('transforms each location once in order without changing parsed input', () => {
    const calls: string[] = [];
    const schema = (
      name: string,
      transform: (input: unknown) => unknown,
    ): StandardSchemaV1 => ({
      '~standard': {
        version: 1,
        vendor: 'request-test',
        validate(input) {
          calls.push(name);
          return { value: transform(input) };
        },
      },
    });
    const route: AppRoute = {
      method: 'POST',
      path: '/:id',
      pathParams: schema('params', () => ({ id: 42 })),
      headers: { 'X-Token': schema('headers', () => 'decoded') },
      query: schema('query', () => 0),
      body: schema('body', () => false),
      responses: { 200: c.noBody() },
    };
    const input = {
      params: { id: '42', extra: 'retained' },
      headers: { 'X-Token': 'raw', other: 'retained' },
      query: { count: '0' },
      body: { enabled: 'false' },
    };

    const result = evaluateRequest(route, input);

    expect(calls).toEqual(['params', 'headers', 'query', 'body']);
    expect(result.paramsResult.value).toEqual({ id: 42, extra: 'retained' });
    expect(result.headersResult.value).toEqual({
      'x-token': 'decoded',
      other: 'retained',
    });
    expect(result.queryResult.value).toBe(0);
    expect(result.bodyResult.value).toBe(false);
    expect(input).toEqual({
      params: { id: '42', extra: 'retained' },
      headers: { 'X-Token': 'raw', other: 'retained' },
      query: { count: '0' },
      body: { enabled: 'false' },
    });
  });

  it('returns every location failure without choosing native error policy', () => {
    const calls: string[] = [];
    const failure = (location: string): StandardSchemaV1 => ({
      '~standard': {
        version: 1,
        vendor: 'request-test',
        validate() {
          calls.push(location);
          return { issues: [{ message: `${location} invalid` }] };
        },
      },
    });
    const route: AppRoute = {
      method: 'POST',
      path: '/',
      pathParams: failure('params'),
      headers: failure('headers'),
      query: failure('query'),
      body: failure('body'),
      responses: { 200: c.noBody() },
    };
    const result = evaluateRequest(route, {
      params: {},
      headers: {},
      query: {},
      body: {},
    });
    expect(calls).toEqual(['params', 'headers', 'query', 'body']);
    for (const [key, message] of [
      ['paramsResult', 'params invalid'],
      ['headersResult', 'headers invalid'],
      ['queryResult', 'query invalid'],
      ['bodyResult', 'body invalid'],
    ] as const) {
      expect(result[key].error?.issues).toEqual([{ message }]);
    }
  });

  it('passes through parsed values where no schema is declared', () => {
    const route: AppRoute = { method: 'GET', path: '/', responses: {} };
    const body = { native: 'body' };
    const result = evaluateRequest(route, {
      params: { extra: 'path' },
      headers: { 'X-Native': 'header' },
      query: undefined,
      body,
    });
    expect(result.paramsResult.value).toEqual({ extra: 'path' });
    expect(result.headersResult.value).toEqual({ 'x-native': 'header' });
    expect(result.queryResult.value).toBeUndefined();
    expect(result.bodyResult.value).toBe(body);
  });

  it('lets first-error callers evaluate only the requested location', () => {
    let bodyCalls = 0;
    const route: AppRoute = {
      method: 'POST',
      path: '/',
      query: {
        '~standard': {
          version: 1,
          vendor: 'request-test',
          validate: () => ({ issues: [{ message: 'query invalid' }] }),
        },
      },
      body: {
        '~standard': {
          version: 1,
          vendor: 'request-test',
          validate: () => {
            bodyCalls++;
            return { value: 'body' };
          },
        },
      },
      responses: {},
    };
    expect(evaluateRequestPart(route, 'query', {}).error?.issues).toEqual([
      { message: 'query invalid' },
    ]);
    expect(bodyCalls).toBe(0);
  });

  it('propagates invalid or asynchronous schema configuration before later locations', () => {
    let queryCalls = 0;
    const route: AppRoute = {
      method: 'GET',
      path: '/',
      pathParams: {
        '~standard': {
          version: 1,
          vendor: 'request-test',
          validate: async () => ({ value: {} }),
        },
      },
      query: {
        '~standard': {
          version: 1,
          vendor: 'request-test',
          validate: () => {
            queryCalls++;
            return { value: {} };
          },
        },
      },
      responses: {},
    };
    const input = { params: {}, headers: {}, query: {}, body: undefined };
    expect(() => evaluateRequest(route, input)).toThrow(
      'Schema validation must be synchronous',
    );
    route.pathParams = { safeParse() {} } as never;
    expect(() => evaluateRequest(route, input)).toThrow(/Standard Schema/);
    expect(queryCalls).toBe(0);
  });
});
