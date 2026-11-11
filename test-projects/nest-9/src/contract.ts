import { initContract, type ContractPlainType } from '@ts-restless/core';

const c = initContract();
const helloBody: ContractPlainType<string> = c.type<string>();

export const contract = c.router({
  getHello: {
    method: 'GET',
    path: '/',
    responses: {
      200: helloBody,
    },
  },
});
