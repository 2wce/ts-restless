/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from 'zod';
import { Equal, Expect } from './test-helpers';
import {
  AreAllPropertiesOptional,
  IfAllPropertiesOptional,
  Without,
  SchemaOutputOrType,
} from './type-utils';

const zodObject = z.object({ title: z.string() });
type Test1 = SchemaOutputOrType<typeof zodObject>;

const zodObjectNullable = zodObject.nullable();
type Test2 = SchemaOutputOrType<typeof zodObject>;

type Test3 = SchemaOutputOrType<{ title: string }>;

it.todo('should infer type');

type AreAllPropertiesOptional1 = Expect<
  Equal<AreAllPropertiesOptional<{ a: string; b?: string }>, false>
>;

type AreAllPropertiesOptional2 = Expect<
  Equal<AreAllPropertiesOptional<{ a?: string; b?: string }>, true>
>;

type AreAllPropertiesOptional3 = Expect<
  Equal<
    AreAllPropertiesOptional<{
      params: {
        id: string;
      };
      headers?: Record<string, string>;
    }>,
    false
  >
>;

type WithoutTest = Expect<
  Equal<
    Without<
      {
        body: never;
        params: {
          id: string;
        };
        headers?: Record<string, string>;
      },
      never
    >,
    {
      params: {
        id: string;
      };
      headers?: Record<string, string>;
    }
  >
>;

type EmptyObjectIsOptional = Expect<Equal<AreAllPropertiesOptional<{}>, true>>;
type PrimitiveIsNotOptional = Expect<
  Equal<AreAllPropertiesOptional<string>, false>
>;
type NullIsNotOptional = Expect<Equal<AreAllPropertiesOptional<null>, false>>;
type RequiredUndefinedIsNotOptional = Expect<
  Equal<AreAllPropertiesOptional<{ value: undefined }>, false>
>;
type OptionalUnionIsOptional = Expect<
  Equal<AreAllPropertiesOptional<{ a?: string } | { b?: number }>, true>
>;
type MixedUnionDistributes = Expect<
  Equal<AreAllPropertiesOptional<{ a?: string } | { b: number }>, boolean>
>;
type NeverRemainsNever = Expect<Equal<AreAllPropertiesOptional<never>, never>>;
type OptionalBranchSelection = Expect<
  Equal<
    IfAllPropertiesOptional<{ a?: string }, 'optional', 'required'>,
    'optional'
  >
>;
type RequiredBranchSelection = Expect<
  Equal<
    IfAllPropertiesOptional<{ a: string }, 'optional', 'required'>,
    'required'
  >
>;
type EmptyBranchSelection = Expect<
  Equal<IfAllPropertiesOptional<{}, 'optional', 'required'>, 'optional'>
>;
type PrimitiveBranchSelection = Expect<
  Equal<IfAllPropertiesOptional<number, 'optional', 'required'>, 'required'>
>;
type MixedBranchSelection = Expect<
  Equal<
    IfAllPropertiesOptional<
      { a?: string } | { b: number },
      'optional',
      'required'
    >,
    'optional' | 'required'
  >
>;
type NeverBranchSelection = Expect<
  Equal<IfAllPropertiesOptional<never, 'optional', 'required'>, never>
>;
