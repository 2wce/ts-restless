import { initTsrReactQuery } from '@ts-restless/react-query';
import { testContract } from '../../contracts/test-contract';

export const tsr = initTsrReactQuery(testContract, {
  baseUrl: 'http://localhost:4200/api/edge',
  baseHeaders: {},
});
