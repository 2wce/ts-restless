/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from 'zod';
import { Equal, Expect } from './test-helpers';
import {
  AreAllPropertiesOptional,
  IfAllPropertiesOptional,
  Without,
  SchemaOutputOrType,
  SchemaInputOrType,
  Opaque,
  UnwrapOpaque,
} from './type-utils';
import { ContractNoBodyType, ContractNullType, ContractPlainType } from './dsl';

const zodObject = z.object({ title: z.string() });
type ObjectOutput = Expect<
  Equal<SchemaOutputOrType<typeof zodObject>, { title: string }>
>;

const zodObjectNullable = zodObject.nullable();
type NullableOutput = Expect<
  Equal<SchemaOutputOrType<typeof zodObjectNullable>, { title: string } | null>
>;

type PlainOutput = Expect<
  Equal<SchemaOutputOrType<{ title: string }>, { title: string }>
>;

type DeclaredPlainOutput = Expect<
  Equal<
    SchemaOutputOrType<ContractPlainType<{ title: string }>>,
    { title: string }
  >
>;
type DeclaredPlainInput = Expect<
  Equal<
    SchemaInputOrType<ContractPlainType<{ title: string }>>,
    { title: string }
  >
>;
type DeclaredNullOutput = Expect<
  Equal<SchemaOutputOrType<ContractNullType>, null>
>;
type DeclaredNullInput = Expect<
  Equal<SchemaInputOrType<ContractNullType>, null>
>;
type DeclaredNoBodyOutput = Expect<
  Equal<SchemaOutputOrType<ContractNoBodyType>, undefined>
>;
type DeclaredNoBodyInput = Expect<
  Equal<SchemaInputOrType<ContractNoBodyType>, undefined>
>;
type ArbitrarySymbolIsNotNoBody = Expect<
  Equal<symbol extends ContractNoBodyType ? true : false, false>
>;
type ArbitrarySymbolIsNotNull = Expect<
  Equal<symbol extends ContractNullType ? true : false, false>
>;
type PlainSymbolIsNotNull = Expect<
  Equal<
    ContractPlainType<symbol> extends ContractNullType ? true : false,
    false
  >
>;
type UnwrapOpaqueString = Expect<
  Equal<UnwrapOpaque<Opaque<string, 'UserId'>>, string>
>;
type UnwrapOpaqueObject = Expect<
  Equal<UnwrapOpaque<Opaque<{ title: string }, 'Title'>>, { title: string }>
>;

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
