import { createServer } from './lib/ts-rest-fastify';

export { RequestValidationError } from './lib/ts-rest-fastify';
export type {
  AppRouteImplementation,
  AppRouteImplementationOrOptions,
  RouterImplementation,
  RouteHooks,
  ApplicationHooks,
} from './lib/ts-rest-fastify';

/** Create an adapter for native Fastify 5. */
export const initServer = () => createServer(5);
