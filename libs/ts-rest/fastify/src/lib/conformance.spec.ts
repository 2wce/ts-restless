import { TsRestResponseValidationError } from '@ts-restless/core';
import fastify from 'fastify';
import supertest from 'supertest';
import {
  describeHttpConformance,
  httpContract,
  HttpHost,
  makeHttpHandlers,
  NativeInput,
  sendHttpRequest,
  TransformInput,
} from '../../../../../tests/conformance/http';
import { initServer } from '../legacy';

describeHttpConformance(async (): Promise<HttpHost> => {
  const app = fastify({ logger: false });
  const inputs: TransformInput[] = [];
  const nativeInputs: NativeInput[] = [];
  const responseErrors: unknown[] = [];
  app.addHook('onError', async (_request, _reply, error) => {
    if (error instanceof TsRestResponseValidationError)
      responseErrors.push(error);
  });
  const handlers = makeHttpHandlers(inputs);
  const s = initServer();
  s.registerRouter(
    httpContract,
    s.router(httpContract, {
      ...handlers,
      transform: async (input) => {
        expect(input.reply.request).toBe(input.request);
        expect(input.appRoute).toBe(httpContract.transform);
        expect(input.request.routeOptions.config.tsRestRoute).toBe(
          httpContract.transform,
        );
        nativeInputs.push({
          params: input.request.params,
          query: input.request.query,
          headers: input.request.headers,
          body: input.request.body,
        });
        return handlers.transform(input);
      },
    }),
    app,
    { logInitialization: false, responseValidation: true },
  );
  await app.ready();

  return {
    inputs,
    nativeInputs,
    request: (input) => sendHttpRequest(supertest(app.server), input),
    close: () => app.close(),
    assertRequestError: (result, errors) => {
      const fields = {
        pathParams: 'pathParameterErrors',
        headers: 'headerErrors',
        query: 'queryParameterErrors',
        body: 'bodyErrors',
      } as const;
      expect(result.body).toEqual(
        Object.fromEntries(
          Object.entries(fields).map(([location, field]) => {
            const path = errors[location as keyof typeof fields];
            return [
              field,
              path === undefined
                ? null
                : expect.objectContaining({
                    name: 'ValidationError',
                    issues: [expect.objectContaining({ path: [path] })],
                  }),
            ];
          }),
        ),
      );
    },
    assertResponseError: (result) => {
      expect(result.body).toMatchObject({
        statusCode: 500,
        error: 'Internal Server Error',
        message: expect.stringContaining('Response validation failed'),
      });
      expect(responseErrors).toHaveLength(1);
      expect(responseErrors[0]).toBeInstanceOf(TsRestResponseValidationError);
      expect(responseErrors[0]).toMatchObject({
        appRoute: httpContract.invalidResponse,
        cause: {
          name: 'ValidationError',
          issues: [expect.objectContaining({ path: ['value'] })],
        },
      });
    },
  };
});
