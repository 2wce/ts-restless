import { z } from 'zod';
import { initContract } from '@ts-restless/core';
import { createFetchHandler, tsr } from '../handlers/ts-rest-fetch';
import { ContractSubContractPaths } from './types';
import { getBoundary, parse as parseMultipart } from 'parse-multipart-data';
import { CompleteRouter, RouterBuilder } from './index';

const c = initContract();

const nestedContract = c.router({
  health: {
    method: 'GET',
    path: '/health',
    responses: {
      200: c.otherResponse({ contentType: 'text/plain', body: c.type<'ok'>() }),
    },
  },
  doubleNested: {
    healthQuick: {
      method: 'GET',
      path: '/health-quick',
      responses: {
        200: c.otherResponse({
          contentType: 'text/plain',
          body: c.type<'ok'>(),
        }),
      },
    },
    age: {
      method: 'GET',
      path: '/age',
      responses: {
        200: c.type<{
          userAge: number;
        }>(),
      },
    },
  },
});

const secondNestedContract = c.router({
  healthSlow: {
    method: 'GET',
    path: '/health-slow',
    responses: {
      200: c.otherResponse({ contentType: 'text/plain', body: c.type<'ok'>() }),
    },
  },
});

const contract = c.router({
  nested: nestedContract,
  secondNested: secondNestedContract,
  authenticated: {
    method: 'GET',
    path: '/profile',
    responses: {
      200: c.type<{ userId: string }>(),
    },
  },
});

type GlobalExtension = {
  globalContext: { health: 'ok' };
  user: { id: string };
};

const routerBuilderBase = tsr
  .routerBuilder(contract)
  .requestMiddleware<Pick<GlobalExtension, 'globalContext'>>(
    async (request) => {
      request.globalContext = { health: 'ok' };
    },
  )
  .requestMiddleware<Pick<GlobalExtension, 'user'>>(async (request) => {
    request.user = { id: '123' };
  });

describe('RouterBuilder', () => {
  let routerBuilder: RouterBuilder<typeof contract, {}, GlobalExtension>;
  let completeRouter: CompleteRouter<typeof contract, {}, GlobalExtension>;

  beforeEach(() => {
    routerBuilder = routerBuilderBase.clone();
  });

  describe('clone ownership', () => {
    const cloneContract = c.router({
      nested: {
        first: {
          method: 'GET',
          path: '/first',
          responses: { 200: c.type<string>() },
        },
        second: {
          method: 'GET',
          path: '/second',
          responses: { 200: c.type<string>() },
        },
      },
    });

    it('keeps original nested handlers when a completed clone is replaced', async () => {
      const original = tsr.routerBuilder(cloneContract).fullRouter({
        nested: {
          first: async () => ({ status: 200, body: 'original first' }),
          second: async () => ({ status: 200, body: 'original second' }),
        },
      });
      const cloned = original.clone().partialRouter({
        nested: {
          first: async () => ({ status: 200, body: 'replacement' }),
        },
      });

      const originalHandler = createFetchHandler(cloneContract, original);
      const clonedHandler = createFetchHandler(cloneContract, cloned);
      const originalResponse = await originalHandler(
        new Request('http://localhost/first'),
      );
      const clonedResponse = await clonedHandler(
        new Request('http://localhost/first'),
      );

      expect(await originalResponse.json()).toBe('original first');
      expect(await clonedResponse.json()).toBe('replacement');
    });

    it('completes nested routes independently in an original and its clone', async () => {
      const partial = tsr.routerBuilder(cloneContract).partialRouter({
        nested: {
          first: async () => ({ status: 200, body: 'shared first' }),
        },
      });
      const cloned = partial.clone().route('nested.second', async () => ({
        status: 200,
        body: 'clone second',
      }));
      const original = partial.route('nested.second', async () => ({
        status: 200,
        body: 'original second',
      }));

      const originalResponse = await createFetchHandler(
        cloneContract,
        original,
      )(new Request('http://localhost/second'));
      const clonedResponse = await createFetchHandler(
        cloneContract,
        cloned,
      )(new Request('http://localhost/second'));

      expect(await originalResponse.json()).toBe('original second');
      expect(await clonedResponse.json()).toBe('clone second');
    });
  });

  const healthHandler = async () => {
    return {
      status: 200,
      body: 'ok',
    } as const;
  };

  const ageMiddlewareAndHandlerOldStyle = tsr.routeWithMiddleware(
    contract.nested.doubleNested.age,
  )<GlobalExtension, { user: { age: number } }>({
    middleware: [
      async (request) => {
        request.user.age = Math.round(Math.random() * 100);
      },
    ],
    handler: async (_, { request }) => {
      return {
        status: 200,
        body: {
          userAge: request.user.age,
        },
      };
    },
  });

  describe('success', () => {
    afterEach(() => {
      expect(completeRouter.build()).toEqual({
        nested: {
          doubleNested: {
            healthQuick: healthHandler,
            age: {
              middleware: [expect.any(Function)],
              handler: expect.any(Function),
            },
          },
          health: healthHandler,
        },
        secondNested: {
          healthSlow: healthHandler,
        },
        authenticated: expect.any(Function),
      });
    });

    it('full router should work', () => {
      completeRouter = routerBuilder.fullRouter({
        nested: {
          doubleNested: {
            healthQuick: healthHandler,
            age: ageMiddlewareAndHandlerOldStyle,
          },
          health: healthHandler,
        },
        secondNested: {
          healthSlow: healthHandler,
        },
        authenticated: async (_, { request }) => {
          return {
            status: 200,
            body: {
              userId: request.user.id,
            },
          };
        },
      });
    });

    it('partial router should work with full router', () => {
      completeRouter = routerBuilder.partialRouter({
        nested: {
          doubleNested: {
            healthQuick: healthHandler,
            age: ageMiddlewareAndHandlerOldStyle,
          },
          health: healthHandler,
        },
        secondNested: {
          healthSlow: healthHandler,
        },
        authenticated: async (_, { request }) => {
          return {
            status: 200,
            body: {
              userId: request.user.id,
            },
          };
        },
      });
    });

    it('partial router should work with routeWithMiddleware', () => {
      completeRouter = routerBuilder
        .partialRouter({
          nested: {
            doubleNested: {
              healthQuick: healthHandler,
            },
            health: healthHandler,
          },
          secondNested: {
            healthSlow: healthHandler,
          },
          authenticated: async (_, { request }) => {
            return {
              status: 200,
              body: {
                userId: request.user.id,
              },
            };
          },
        })
        .routeWithMiddleware('nested.doubleNested.age', (routeBuilder) =>
          routeBuilder
            .middleware<{ user: { age: number } }>(async (request) => {
              request.user.age = Math.round(Math.random() * 100);
            })
            .handler(async (_, { request }) => {
              return {
                status: 200,
                body: {
                  userAge: request.user.age,
                },
              };
            }),
        );
    });

    it('partial router should work with routeWithMiddleware and route', () => {
      completeRouter = routerBuilder
        .partialRouter({
          nested: {
            doubleNested: {
              healthQuick: healthHandler,
            },
          },
          secondNested: {
            healthSlow: healthHandler,
          },
          authenticated: async (_, { request }) => {
            return {
              status: 200,
              body: {
                userId: request.user.id,
              },
            };
          },
        })
        .routeWithMiddleware('nested.doubleNested.age', (routeBuilder) =>
          routeBuilder
            .middleware<{ user: { age: number } }>(async (request) => {
              request.user.age = Math.round(Math.random() * 100);
            })
            .handler(async (_, { request }) => {
              return {
                status: 200,
                body: {
                  userAge: request.user.age,
                },
              };
            }),
        )
        .route('nested.health', healthHandler);
    });

    it('partial router should work with another partial router with old-style middleware', () => {
      completeRouter = routerBuilder
        .partialRouter({
          nested: {
            doubleNested: {
              healthQuick: healthHandler,
            },
            health: healthHandler,
          },
          secondNested: {
            healthSlow: healthHandler,
          },
          authenticated: async (_, { request }) => {
            return {
              status: 200,
              body: {
                userId: request.user.id,
              },
            };
          },
        })
        .partialRouter({
          nested: {
            doubleNested: {
              age: ageMiddlewareAndHandlerOldStyle,
            },
          },
        });
    });

    it('sub router should work with CompleteRouter of sub-contract', () => {
      completeRouter = routerBuilder
        .subRouter(
          'secondNested',
          tsr.routerBuilder(contract.secondNested).fullRouter({
            healthSlow: healthHandler,
          }),
        )
        .partialRouter({
          nested: {
            doubleNested: {
              healthQuick: healthHandler,
              age: ageMiddlewareAndHandlerOldStyle,
            },
            health: healthHandler,
          },
          authenticated: async (_, { request }) => {
            return {
              status: 200,
              body: {
                userId: request.user.id,
              },
            };
          },
        });
    });

    it('sub router should work with full sub-contract', () => {
      completeRouter = routerBuilder
        .subRouter('secondNested', {
          healthSlow: healthHandler,
        })
        .partialRouter({
          nested: {
            doubleNested: {
              healthQuick: healthHandler,
              age: ageMiddlewareAndHandlerOldStyle,
            },
            health: healthHandler,
          },
          authenticated: async (_, { request }) => {
            return {
              status: 200,
              body: {
                userId: request.user.id,
              },
            };
          },
        });
    });
  });

  describe('fail', () => {
    it('partial router should fail if missing routes', () => {
      const incompleteRouter = routerBuilder.partialRouter({
        nested: {
          doubleNested: {
            healthQuick: healthHandler,
          },
          health: healthHandler,
        },
        secondNested: {
          healthSlow: healthHandler,
        },
        authenticated: async (_, { request }) => {
          return {
            status: 200,
            body: {
              userId: request.user.id,
            },
          };
        },
      });

      // @ts-expect-error - .build() should not exist on RouterBuilder since we are missing a route
      expect(() => incompleteRouter.build()).toThrowError(
        'completeRouter.build is not a function',
      );
    });

    it('route should fail if missing routes', () => {
      const incompleteRouter = routerBuilder
        .partialRouter({
          nested: {
            doubleNested: {
              healthQuick: healthHandler,
            },
          },
          secondNested: {
            healthSlow: healthHandler,
          },
          authenticated: async (_, { request }) => {
            return {
              status: 200,
              body: {
                userId: request.user.id,
              },
            };
          },
        })
        .route('nested.health', healthHandler);

      // @ts-expect-error - .build() should not exist on RouterBuilder since we are missing a route
      expect(() => incompleteRouter.build()).toThrowError(
        'completeRouter.build is not a function',
      );
    });

    it('sub-router should fail if missing routes', () => {
      const incompleteRouter = routerBuilder
        .partialRouter({
          nested: {
            doubleNested: {
              healthQuick: healthHandler,
              age: ageMiddlewareAndHandlerOldStyle,
            },
          },
          authenticated: async (_, { request }) => {
            return {
              status: 200,
              body: {
                userId: request.user.id,
              },
            };
          },
        })
        .subRouter('secondNested', {
          healthSlow: healthHandler,
        });

      // @ts-expect-error - .build() should not exist on RouterBuilder since we are missing a route
      expect(() => incompleteRouter.build()).toThrowError(
        'completeRouter.build is not a function',
      );
    });
  });
});
