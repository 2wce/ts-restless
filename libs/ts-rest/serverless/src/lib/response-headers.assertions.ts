import { initContract, ServerInferResponses } from '@ts-restless/core';
import { AppRouteImplementation } from './types';
import { createFetchHandler } from './handlers/ts-rest-fetch';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;
const c = initContract();
const contract = c.router({
  get: {
    method: 'GET',
    path: '/headers',
    responses: { 200: c.type<{ ok: boolean }>(), 204: c.noBody() },
  },
});
type Result = Awaited<
  ReturnType<AppRouteImplementation<typeof contract.get, {}, {}>>
>;
export type NativeHeaders = Expect<
  Equal<Result['headers'], HeadersInit | undefined>
>;
export type CoreStillOwnsStatusBody = Expect<
  Equal<keyof ServerInferResponses<typeof contract.get>, 'status' | 'body'>
>;
const inputs: HeadersInit[] = [
  { 'x-header': 'record' },
  [['x-header', 'tuple']],
  new Headers({ 'x-header': 'native' }),
];
for (const headers of inputs) {
  const valid: Result = { status: 200, body: { ok: true }, headers };
  const empty: Result = { status: 204, body: undefined, headers };
  void [valid, empty];
  createFetchHandler(contract, {
    get: async () => ({ status: 200, body: { ok: true }, headers }),
  });
}
const invalid: Result = {
  status: 200,
  body: { ok: true },
  // @ts-expect-error HeadersInit values must be strings
  headers: { 'x-number': 123 },
};
void invalid;
