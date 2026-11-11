/* eslint-disable no-unused-vars -- These type aliases are compile-time regression assertions. */
import { z } from 'zod4';
import { z as legacyZod } from 'zod-legacy';
import * as v from 'valibot';
import { initContract, type ContractAnyType } from './dsl';
import type { ClientInferRequest, ServerInferRequest } from './infer-types';
import type { StandardSchemaV1 } from './standard-schema';
import type { Equal, Expect } from './test-helpers';
import { validateMultiSchemaObject } from './standard-schema-utils';
import { StandardSchemaError } from './validation-error';
import { toStandardSchema } from '../legacy';

const c = initContract();

const standardString: StandardSchemaV1<string> = {
  '~standard': {
    version: 1,
    vendor: 'header-test',
    validate: (value) =>
      typeof value === 'string'
        ? { value }
        : { issues: [{ message: 'Expected string' }] },
  },
};
const standardNumber: StandardSchemaV1<string, number> = {
  '~standard': {
    version: 1,
    vendor: 'header-test',
    validate: (value) =>
      typeof value === 'string'
        ? { value: Number(value) }
        : { issues: [{ message: 'Expected string' }] },
  },
};
const standardOptional: StandardSchemaV1<string | undefined> = {
  '~standard': {
    version: 1,
    vendor: 'header-test',
    validate: (value) =>
      value === undefined || typeof value === 'string'
        ? { value }
        : { issues: [{ message: 'Expected optional string' }] },
  },
};
const standardDefault: StandardSchemaV1<string | undefined, number> = {
  '~standard': {
    version: 1,
    vendor: 'header-test',
    validate: (value) =>
      value === undefined || typeof value === 'string'
        ? { value: Number(value ?? '7') }
        : { issues: [{ message: 'Expected optional string' }] },
  },
};

const profiles = {
  'Zod 4': {
    'Idempotency-Key': z.string(),
    'X-Count': z.string().transform(Number),
    'X-Note': z.string().optional(),
    'X-Default': z.string().optional().default('7').transform(Number),
  },
  Valibot: {
    'Idempotency-Key': v.string(),
    'X-Count': v.pipe(v.string(), v.transform(Number)),
    'X-Note': v.optional(v.string()),
    'X-Default': v.pipe(v.optional(v.string(), '7'), v.transform(Number)),
  },
  'Standard Schema': {
    'Idempotency-Key': standardString,
    'X-Count': standardNumber,
    'X-Note': standardOptional,
    'X-Default': standardDefault,
  },
  'legacy Zod 3 bridge': {
    'Idempotency-Key': toStandardSchema(legacyZod.string()),
    'X-Count': toStandardSchema(legacyZod.string().transform(Number)),
    'X-Note': toStandardSchema(legacyZod.string().optional()),
    'X-Default': toStandardSchema(
      legacyZod.string().optional().default('7').transform(Number),
    ),
  },
};

function headerRoute<T extends Record<string, ContractAnyType>>(headers: T) {
  return c.query({
    method: 'GET',
    path: '/headers',
    headers,
    responses: { 200: c.type<{ ok: boolean }>() },
  });
}

const routes = {
  zod4: headerRoute(profiles['Zod 4']),
  valibot: headerRoute(profiles.Valibot),
  standard: headerRoute(profiles['Standard Schema']),
  legacy: headerRoute(profiles['legacy Zod 3 bridge']),
};

type ClientHeaders = {
  'idempotency-key': string;
  'x-count': string;
  'x-note'?: string;
  'x-default'?: string;
};
type ServerHeaders = {
  'idempotency-key': string;
  'x-count': number;
  'x-note'?: string;
  'x-default': number;
};

describe('Standard Schema header inference', () => {
  it('infers exact input and output maps for each validator', () => {
    type Inputs = [
      Expect<
        Equal<ClientInferRequest<typeof routes.zod4>['headers'], ClientHeaders>
      >,
      Expect<
        Equal<
          ClientInferRequest<typeof routes.valibot>['headers'],
          ClientHeaders
        >
      >,
      Expect<
        Equal<
          ClientInferRequest<typeof routes.standard>['headers'],
          ClientHeaders
        >
      >,
      Expect<
        Equal<
          ClientInferRequest<typeof routes.legacy>['headers'],
          ClientHeaders
        >
      >,
    ];
    type Outputs = [
      Expect<
        Equal<ServerInferRequest<typeof routes.zod4>['headers'], ServerHeaders>
      >,
      Expect<
        Equal<
          ServerInferRequest<typeof routes.valibot>['headers'],
          ServerHeaders
        >
      >,
      Expect<
        Equal<
          ServerInferRequest<typeof routes.standard>['headers'],
          ServerHeaders
        >
      >,
      Expect<
        Equal<
          ServerInferRequest<typeof routes.legacy>['headers'],
          ServerHeaders
        >
      >,
    ];

    const request: ClientInferRequest<typeof routes.zod4> = {
      headers: { 'idempotency-key': 'request-1', 'x-count': '12' },
    };
    const missing: ClientInferRequest<typeof routes.zod4> = {
      // @ts-expect-error the required idempotency header is absent
      headers: { 'x-count': '12' },
    };
    const wrong: ClientInferRequest<typeof routes.zod4> = {
      // @ts-expect-error transforms accept strings on the client, not their numeric output
      headers: { 'idempotency-key': 'request-1', 'x-count': 12 },
    };
    expect(request.headers['x-count']).toBe('12');
    void [missing, wrong];
  });

  it.each(Object.entries(profiles))(
    'validates normalized %s field headers and applies defaults',
    (_, headers) => {
      expect(
        validateMultiSchemaObject(
          {
            'IDEMPOTENCY-KEY': 'request-1',
            'x-count': '12',
            'X-Extra': 'kept',
          },
          headers,
        ).value,
      ).toEqual({
        'idempotency-key': 'request-1',
        'x-count': 12,
        'x-note': undefined,
        'x-default': 7,
        'x-extra': 'kept',
      });
    },
  );

  it.each(Object.entries(profiles))(
    'reports normalized %s required-header failures',
    (_, headers) => {
      const result = validateMultiSchemaObject({ 'x-count': '12' }, headers);
      expect(result.error).toBeInstanceOf(StandardSchemaError);
      expect(result.error?.issues).toEqual([
        expect.objectContaining({ path: ['idempotency-key'] }),
      ]);
    },
  );

  it.each(Object.entries(profiles))(
    'rejects incorrect %s header values',
    (_, headers) => {
      const result = validateMultiSchemaObject(
        { 'idempotency-key': 12, 'x-count': '12' },
        headers,
      );
      expect(result.error).toBeInstanceOf(StandardSchemaError);
      expect(result.error?.issues).toEqual([
        expect.objectContaining({ path: ['idempotency-key'] }),
      ]);
    },
  );

  it('normalizes plain field headers without changing absent data', () => {
    expect(
      validateMultiSchemaObject(
        { 'X-Key': 'request-1' },
        { 'X-Key': c.type<string>() },
      ).value,
    ).toEqual({ 'x-key': 'request-1' });
    expect(
      validateMultiSchemaObject(undefined, undefined).value,
    ).toBeUndefined();
    expect(validateMultiSchemaObject(null, null).value).toBeNull();
  });

  it('preserves object-valued transform keys', () => {
    const route = headerRoute({
      'X-User': z.string().transform((value) => ({ UserID: Number(value) })),
    });
    type Output = Expect<
      Equal<
        ServerInferRequest<typeof route>['headers'],
        { 'x-user': { UserID: number } }
      >
    >;
    expect(
      validateMultiSchemaObject({ 'x-user': '12' }, route.headers).value,
    ).toEqual({ 'x-user': { UserID: 12 } });
  });

  it('merges nested field records by HTTP name and removes case variants with null', () => {
    const contract = c.router(
      {
        nested: c.router(
          {
            get: headerRoute({
              'x-count': z.string().transform(Number),
              AUTHORIZATION: null,
            }),
          },
          {
            baseHeaders: {
              'X-Count': z.literal('base'),
              'X-Note': z.string().optional(),
            },
          },
        ),
      },
      {
        baseHeaders: {
          Authorization: z.string(),
          'X-Count': z.literal('outer'),
        },
      },
    );

    type Input = Expect<
      Equal<
        ClientInferRequest<typeof contract.nested.get>['headers'],
        { 'x-count': string; 'x-note'?: string }
      >
    >;
    type Output = Expect<
      Equal<
        ServerInferRequest<typeof contract.nested.get>['headers'],
        { 'x-count': number; 'x-note'?: string }
      >
    >;
    expect(
      validateMultiSchemaObject(
        { 'x-count': '12' },
        contract.nested.get.headers,
      ).value,
    ).toEqual({ 'x-count': 12, 'x-note': undefined });
  });

  it('infers plain header maps with optional fields', () => {
    const route = c.query({
      method: 'GET',
      path: '/plain',
      headers: c.type<{ 'X-Key': string; 'X-Note'?: string }>(),
      responses: { 200: null },
    });
    type Input = Expect<
      Equal<
        ClientInferRequest<typeof route>['headers'],
        { 'x-key': string; 'x-note'?: string }
      >
    >;
    type Output = Expect<
      Equal<
        ServerInferRequest<typeof route>['headers'],
        { 'x-key': string; 'x-note'?: string }
      >
    >;
  });

  it('infers nested plain header maps with case-insensitive overrides', () => {
    const contract = c.router(
      {
        nested: c.router(
          {
            get: c.query({
              method: 'GET',
              path: '/plain',
              headers: c.type<{ 'x-key': 'route'; 'X-Note'?: string }>(),
              responses: { 200: null },
            }),
          },
          { baseHeaders: c.type<{ 'X-Key': string; 'X-Base': string }>() },
        ),
      },
      { baseHeaders: c.type<{ 'X-Outer': string }>() },
    );
    type Headers = {
      'x-key': 'route';
      'x-note'?: string;
      'x-base': string;
      'x-outer': string;
    };
    type Input = Expect<
      Equal<ClientInferRequest<typeof contract.nested.get>['headers'], Headers>
    >;
    type Output = Expect<
      Equal<ServerInferRequest<typeof contract.nested.get>['headers'], Headers>
    >;
  });

  it('supports lowercase whole-object Zod 4 and bridged legacy headers', () => {
    const zod4 = c.query({
      method: 'GET',
      path: '/whole',
      headers: z.object({
        'x-count': z.string().transform(Number),
        'x-note': z.string().optional(),
      }),
      responses: { 200: null },
    });
    const legacy = c.query({
      method: 'GET',
      path: '/whole',
      headers: toStandardSchema(
        legacyZod.object({
          'x-count': legacyZod.string().transform(Number),
          'x-note': legacyZod.string().optional(),
        }),
      ),
      responses: { 200: null },
    });
    type Inputs = [
      Expect<
        Equal<
          ClientInferRequest<typeof zod4>['headers'],
          { 'x-count': string; 'x-note'?: string }
        >
      >,
      Expect<
        Equal<
          ClientInferRequest<typeof legacy>['headers'],
          { 'x-count': string; 'x-note'?: string }
        >
      >,
    ];
    type Outputs = [
      Expect<
        Equal<
          ServerInferRequest<typeof zod4>['headers'],
          { 'x-count': number; 'x-note'?: string }
        >
      >,
      Expect<
        Equal<
          ServerInferRequest<typeof legacy>['headers'],
          { 'x-count': number; 'x-note'?: string }
        >
      >,
    ];
    for (const route of [zod4, legacy]) {
      expect(
        validateMultiSchemaObject({ 'x-count': '12' }, route.headers).value,
      ).toEqual({ 'x-count': 12 });
    }
  });
});
