import { initTsrReactQuery } from '@ts-restless/react-query';
import { apiBlog } from '@ts-restless/example-contracts';

export const tsr = initTsrReactQuery(apiBlog, {
  baseUrl: 'http://localhost:4200/api',
  baseHeaders: {
    'x-api-key': 'key',
  },
});
