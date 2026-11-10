import { queryFn } from './common';
import { vi } from 'vitest';
import { ApiFetcher, ApiFetcherArgs, initContract } from '@ts-restless/core';
import { z } from 'zod';
import { initQueryClient } from './vue-query';
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query';
import { createApp, unref, ref, computed, toRaw } from 'vue';
import { waitFor } from '@testing-library/vue';

const act = <TResult>(cb: () => TResult) => cb();

const c = initContract();

export type Post = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  published: boolean;
  authorId: string;
};

export type User = {
  id: string;
  email: string;
  name: string | null;
};

const postsRouter = c.router(
  {
    getPost: {
      method: 'GET',
      path: `/posts/:id`,
      responses: {
        200: c.type<Post | null>(),
      },
    },
    getPosts: {
      method: 'GET',
      path: '/posts',
      responses: {
        200: c.type<Post[]>(),
      },
      query: z.object({
        take: z.number().optional(),
        skip: z.number().optional(),
      }),
    },
    createPost: {
      method: 'POST',
      path: '/posts',
      responses: {
        200: c.type<Post>(),
      },
      body: z.object({
        title: z.string(),
        content: z.string(),
        published: z.boolean().optional(),
        description: z.string().optional(),
        authorId: z.string(),
      }),
    },
    mutationWithQuery: {
      method: 'POST',
      path: '/posts',
      responses: {
        200: c.type<Post>(),
      },
      body: z.object({}),
      query: z.object({
        test: z.string(),
      }),
    },
    updatePost: {
      method: 'PUT',
      path: `/posts/:id`,
      responses: {
        200: c.type<Post>(),
      },
      body: z.object({
        title: z.string(),
        content: z.string(),
        published: z.boolean().optional(),
        description: z.string().optional(),
        authorId: z.string(),
      }),
    },
    patchPost: {
      method: 'PATCH',
      path: `/posts/:id`,
      responses: {
        200: c.type<Post>(),
      },
      body: null,
    },
    deletePost: {
      method: 'DELETE',
      path: `/posts/:id`,
      responses: {
        200: c.type<boolean>(),
      },
      body: null,
    },
    uploadImage: {
      method: 'POST',
      path: `/posts/:id/image`,
      responses: {
        200: c.type<Post>(),
      },
      contentType: 'multipart/form-data',
      body: c.body<{ image: File }>(),
    },
  },
  {
    baseHeaders: z.object({
      'x-test': z.string(),
    }),
  },
);

// Three endpoints, two for posts, and one for health
export const router = c.router({
  posts: postsRouter,
  health: {
    method: 'GET',
    path: '/health',
    responses: {
      200: c.type<{ message: string }>(),
    },
  },
});

const api = vi.fn();

const client = initQueryClient(router, {
  baseUrl: 'https://api.com',
  baseHeaders: {
    'x-test': 'test',
  },
  api: api as ApiFetcher,
});

const wrapper = () => document.createElement('div');

const SUCCESS_RESPONSE = {
  status: 200,
  body: {
    posts: [],
  },
};

const ERROR_RESPONSE = {
  status: 500,
  body: {
    message: 'Internal Server Error',
  },
};

function renderHook<TResult>(
  composable: () => TResult,
  {
    wrapper,
    queryClient,
  }: { wrapper: () => Element; queryClient?: QueryClient },
) {
  let result: TResult;

  const app = createApp({
    setup() {
      result = composable();
      // suppress missing template warning
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {};
    },
  });
  app.use(VueQueryPlugin, { queryClient }).mount(wrapper());

  return {
    result: { all: [], current: result! },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    rerender: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    unmount: () => app.unmount(),
    waitFor: () => Promise.resolve(),
    waitForNextUpdate: () => Promise.resolve(),
    waitForValueToChange: () => Promise.resolve(),
  };
}

describe('vue-query', () => {
  beforeEach(() => {
    api.mockReset();
  });

  it('useQuery should handle success', async () => {
    api.mockResolvedValue(SUCCESS_RESPONSE);

    const { result } = renderHook(() => client.health.useQuery(['health']), {
      wrapper,
    });

    expect(unref(result.current.data)).toStrictEqual(undefined);

    expect(unref(result.current.isLoading)).toStrictEqual(true);

    expect(api).toHaveBeenCalledWith({
      validateResponse: false,
      method: 'GET',
      path: 'https://api.com/health',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: router.health,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });

    await waitFor(() => {
      expect(unref(result.current.isLoading)).toStrictEqual(false);
    });

    expect(unref(result.current.data)).toStrictEqual(SUCCESS_RESPONSE);
  });

  it('useQuery with select should handle success', async () => {
    api.mockResolvedValue({ status: 200, body: { message: 'hello world' } });

    const { result } = renderHook(
      () =>
        client.health.useQuery(['health'], () => ({}), {
          select: (data) => data.body.message,
        }),
      {
        wrapper,
      },
    );

    expect(unref(result.current.data)).toStrictEqual(undefined);

    expect(unref(result.current.isLoading)).toStrictEqual(true);

    expect(api).toHaveBeenCalledWith({
      validateResponse: false,
      method: 'GET',
      path: 'https://api.com/health',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: router.health,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });

    await waitFor(() => {
      expect(unref(result.current.isLoading)).toStrictEqual(false);
    });

    expect(unref(result.current.data)).toStrictEqual('hello world');
  });

  it('useQuery should accept extra headers', async () => {
    api.mockResolvedValue(SUCCESS_RESPONSE);

    const { result } = renderHook(
      () =>
        client.posts.getPost.useQuery(['post', '1'], () => ({
          params: {
            id: '1',
          },
          headers: {
            'x-test': 'test',
          },
        })),
      {
        wrapper,
      },
    );

    expect(unref(result.current.data)).toStrictEqual(undefined);

    expect(unref(result.current.isLoading)).toStrictEqual(true);

    expect(api).toHaveBeenCalledWith({
      validateResponse: false,
      method: 'GET',
      path: 'https://api.com/posts/1',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: router.posts.getPost,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });
  });

  it('useQuery should override base headers', async () => {
    api.mockResolvedValue(SUCCESS_RESPONSE);

    const { result } = renderHook(
      () =>
        client.posts.getPost.useQuery(['post', '1'], () => ({
          params: {
            id: '1',
          },
          headers: {
            'x-test': 'foo',
          },
          extraHeaders: {
            'content-type': 'application/xml',
          },
        })),
      {
        wrapper,
      },
    );

    expect(unref(result.current.data)).toStrictEqual(undefined);

    expect(unref(result.current.isLoading)).toStrictEqual(true);

    expect(api).toHaveBeenCalledWith({
      validateResponse: false,
      method: 'GET',
      path: 'https://api.com/posts/1',
      body: undefined,
      headers: {
        'content-type': 'application/xml',
        'x-test': 'foo',
      },
      route: router.posts.getPost,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });
  });

  it('useQuery should remove header if value is undefined', async () => {
    api.mockResolvedValue(SUCCESS_RESPONSE);

    const { result } = renderHook(
      () =>
        client.posts.getPost.useQuery(['post', '1'], () => ({
          params: {
            id: '1',
          },
          extraHeaders: {
            // The runtime accepts undefined to remove a header.
            // @ts-expect-error Extra headers currently require string values.
            'content-type': undefined,
          },
        })),
      {
        wrapper,
      },
    );

    expect(unref(result.current.data)).toStrictEqual(undefined);

    expect(unref(result.current.isLoading)).toStrictEqual(true);

    expect(api).toHaveBeenCalledWith({
      validateResponse: false,
      method: 'GET',
      path: 'https://api.com/posts/1',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: router.posts.getPost,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });
  });

  it('useQuery should accept non-json string response', () => {
    api.mockResolvedValue({
      status: 200,
      body: 'Hello World',
    });

    const { result } = renderHook(() => client.health.useQuery(['health']), {
      wrapper,
    });

    expect(unref(result.current.data)).toStrictEqual(undefined);

    expect(unref(result.current.isLoading)).toStrictEqual(true);

    expect(api).toHaveBeenCalledWith({
      validateResponse: false,
      method: 'GET',
      path: 'https://api.com/health',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: router.health,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });

    return waitFor(() => {
      expect(unref(result.current.isLoading)).toStrictEqual(false);
      expect(unref(result.current.data)).toStrictEqual({
        status: 200,
        body: 'Hello World',
      });
    });
  });

  it('useQuery should handle failure', async () => {
    api.mockResolvedValue(ERROR_RESPONSE);

    const { result } = renderHook(
      () =>
        client.health.useQuery(['health'], () => ({}), { retry: () => false }),
      { wrapper },
    );

    expect(unref(result.current.data)).toStrictEqual(undefined);

    expect(unref(result.current.isLoading)).toStrictEqual(true);

    expect(api).toHaveBeenCalledWith({
      validateResponse: false,
      method: 'GET',
      path: 'https://api.com/health',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: router.health,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });

    await waitFor(() => {
      expect(unref(result.current.isLoading)).toStrictEqual(false);
    });

    expect(unref(result.current.data)).toStrictEqual(undefined);

    expect(unref(result.current.error)).toStrictEqual(ERROR_RESPONSE);
  });

  it('should handle mutation', async () => {
    api.mockResolvedValue(SUCCESS_RESPONSE);

    const { result } = renderHook(() => client.posts.createPost.useMutation(), {
      wrapper,
    });

    expect(unref(result.current.data)).toStrictEqual(undefined);

    expect(unref(result.current.isPending)).toStrictEqual(false);

    expect(unref(result.current.error)).toStrictEqual(null);

    await act(() =>
      result.current.mutateAsync({
        body: {
          description: 'test',
          title: 'test',
          content: '',
          authorId: '1',
        },
      }),
    );

    expect(api).toHaveBeenCalledWith({
      validateResponse: false,
      method: 'POST',
      path: 'https://api.com/posts',
      body: JSON.stringify({
        description: 'test',
        title: 'test',
        content: '',
        authorId: '1',
      }),
      headers: {
        'content-type': 'application/json',
        'x-test': 'test',
      },
      rawBody: {
        authorId: '1',
        content: '',
        description: 'test',
        title: 'test',
      },
      contentType: 'application/json',
      route: router.posts.createPost,
      signal: undefined,
      fetchOptions: {},
    });

    await waitFor(() => {
      expect(unref(result.current.data)).not.toBeUndefined();
    });

    expect(unref(result.current.data)).toStrictEqual(SUCCESS_RESPONSE);
  });
});

it('A11 Vue preserves request signal and resolved HTTP error identity', async () => {
  const { QueryClient } = await import('@tanstack/vue-query');
  const route = c.router({
    read: {
      method: 'GET',
      path: '/a11',
      responses: {
        200: c.type<{ value: string }>(),
        404: c.type<{ missing: true }>(),
      },
    },
  }).read;
  const failure = {
    status: 404,
    body: { missing: true },
    headers: new Headers(),
  };
  const api = vi.fn(async (_args: ApiFetcherArgs) => failure);
  const controller = new AbortController();
  const mapper = vi.fn(() => ({
    params: {},
    body: undefined,
    query: undefined,
    headers: {},
    fetchOptions: { signal: controller.signal },
  }));
  const native = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  try {
    await expect(
      native.fetchQuery({
        queryKey: ['a11'],
        queryFn: queryFn(
          route,
          { baseUrl: 'https://a11.example', api },
          mapper,
        ),
      }),
    ).rejects.toBe(failure);
    expect(mapper.mock.calls).toHaveLength(1);
    expect(api.mock.calls[0][0].fetchOptions?.signal).toBe(controller.signal);
  } finally {
    native.clear();
  }
});

describe('Vue Query v5 migration', () => {
  const localContract = c.router({
    read: {
      method: 'GET',
      path: '/items/:id',
      responses: { 200: c.type<{ value: string }>() },
    },
    pages: {
      method: 'GET',
      path: '/pages',
      query: c.type<{ cursor: number }>(),
      responses: {
        200: c.type<{ next: number }>(),
        404: c.type<{ missing: true }>(),
      },
    },
  });
  it('tracks a computed key and maps current reactive request input', async () => {
    const api = vi.fn(async (args: ApiFetcherArgs) => ({
      status: 200,
      body: { value: args.path },
      headers: new Headers(),
    }));
    const client = initQueryClient(localContract, {
      baseUrl: 'https://vue.example',
      api,
    });
    const id = ref('1');
    const h = renderHook(
      () =>
        client.read.useQuery(
          computed(() => ['item', id.value]),
          () => ({ params: { id: id.value } }),
          { select: (response) => response.body.value },
        ),
      { wrapper },
    );
    try {
      await waitFor(() =>
        expect(h.result.current.data.value).toBe('https://vue.example/items/1'),
      );
      const selected: string | undefined = h.result.current.data.value;
      void selected;
      id.value = '2';
      await waitFor(() =>
        expect(h.result.current.data.value).toBe('https://vue.example/items/2'),
      );
      expect(api).toHaveBeenCalledTimes(2);
    } finally {
      h.unmount();
    }
  });
  it('forwards numeric page context, native signal and later-page HTTP error', async () => {
    const failure = {
      status: 404,
      body: { missing: true },
      headers: new Headers(),
    };
    const api = vi.fn(async (args: ApiFetcherArgs) => {
      const cursor = (args.rawQuery as { cursor: number }).cursor;
      return cursor < 2
        ? { status: 200, body: { next: cursor + 1 }, headers: new Headers() }
        : failure;
    });
    const native = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const client = initQueryClient(localContract, {
      baseUrl: 'https://vue.example',
      api,
    });
    const h = renderHook(
      () =>
        client.pages.useInfiniteQuery(
          ['pages'],
          ({ pageParam }) => {
            const cursor: number = pageParam;
            return { query: { cursor } };
          },
          { initialPageParam: 0, getNextPageParam: (last) => last.body.next },
        ),
      { wrapper, queryClient: native },
    );
    try {
      await waitFor(() => expect(h.result.current.isSuccess.value).toBe(true));
      await h.result.current.fetchNextPage();
      expect(
        h.result.current.data.value?.pages.map((page) => page.body.next),
      ).toEqual([1, 2]);
      await h.result.current.fetchNextPage();
      await waitFor(() =>
        expect(toRaw(h.result.current.error.value)).toBe(failure),
      );
      expect(api.mock.calls.map(([args]) => args.rawQuery)).toEqual([
        { cursor: 0 },
        { cursor: 1 },
        { cursor: 2 },
      ]);
      for (const [args] of api.mock.calls)
        expect(args.fetchOptions?.signal).toBeInstanceOf(AbortSignal);
    } finally {
      h.unmount();
      native.clear();
    }
  });
  it('native cancellation reaches the active transport', async () => {
    const aborted = vi.fn();
    const api = vi.fn(
      (args: ApiFetcherArgs) =>
        new Promise<{ status: number; body: unknown; headers: Headers }>(
          (_resolve, reject) => {
            args.fetchOptions?.signal?.addEventListener(
              'abort',
              () => {
                aborted();
                reject(new DOMException('Aborted', 'AbortError'));
              },
              { once: true },
            );
          },
        ),
    );
    const native = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const client = initQueryClient(localContract, {
      baseUrl: 'https://vue.example',
      api,
    });
    const h = renderHook(
      () => client.read.useQuery(['cancel'], () => ({ params: { id: '1' } })),
      { wrapper, queryClient: native },
    );
    try {
      await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
      await native.cancelQueries({ queryKey: ['cancel'] });
      expect(aborted).toHaveBeenCalledTimes(1);
    } finally {
      h.unmount();
      native.clear();
    }
  });
});
