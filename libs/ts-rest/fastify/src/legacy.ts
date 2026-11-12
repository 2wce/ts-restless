import { createServer } from './lib/ts-rest-fastify';

export { RequestValidationError } from './lib/ts-rest-fastify';
export type {
  AppRouteImplementation,
  AppRouteImplementationOrOptions,
  RouterImplementation,
  RouteHooks,
  ApplicationHooks,
} from './lib/ts-rest-fastify';

/**
 * @deprecated Fastify 4 support is retained through ts-restless v4 and scheduled
 * for removal in ts-restless v5 after the stable migration window. Upgrade to
 * Fastify 5 and import initServer from @ts-restless/fastify.
 */
export const initServer = () => createServer(4);
