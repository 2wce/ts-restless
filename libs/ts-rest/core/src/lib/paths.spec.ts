import { insertParamsIntoPath, type ParamsFromUrl } from './paths';
import type { Equal, Expect } from './test-helpers';

export type PathParameterAssertions = [
  Expect<
    Equal<
      ParamsFromUrl<'/post/:id/comments/:commentId'>,
      { id: string; commentId: string }
    >
  >,
  Expect<Equal<ParamsFromUrl<'/post/:id/comments'>, { id: string }>>,
  Expect<Equal<ParamsFromUrl<'/post/:id'>, { id: string }>>,
  Expect<Equal<ParamsFromUrl<'/posts'>, {}>>,
  Expect<
    Equal<
      ParamsFromUrl<'/post/:id/comments/:commentId/:commentId2'>,
      { id: string; commentId: string; commentId2: string }
    >
  >,
  Expect<Equal<ParamsFromUrl<'/post/:id?'>, { id?: string }>>,
  Expect<
    Equal<
      ParamsFromUrl<'/post/:id?/comments/:commentId?'>,
      { id?: string; commentId?: string }
    >
  >,
  Expect<
    Equal<
      ParamsFromUrl<'/post/:id/comments/:commentId?'>,
      { id: string; commentId?: string }
    >
  >,
  Expect<
    Equal<
      ParamsFromUrl<'/post/:id?/comments/:commentId'>,
      { id?: string; commentId: string }
    >
  >,
];

describe('insertParamsIntoPath', () => {
  it('should insert params into path', () => {
    expect(
      insertParamsIntoPath({
        path: '/post/:id/comments/:commentId',
        params: { commentId: '2', id: '1' },
      }),
    ).toBe('/post/1/comments/2');
  });

  it('should insert params into path with no params', () => {
    expect(
      insertParamsIntoPath({
        path: '/posts',
        params: { a: '1' },
      }),
    ).toBe('/posts');
  });

  it('should insert params into path with many params', () => {
    expect(
      insertParamsIntoPath({
        path: '/post/:id/comments/:commentId/:commentId2',
        params: { commentId: '2', commentId2: '3', id: '1' },
      }),
    ).toBe('/post/1/comments/2/3');
  });

  it('should insert into paths with only one param', () => {
    expect(
      insertParamsIntoPath({
        path: '/:id',
        params: { id: '1' },
      }),
    ).toBe('/1');
  });

  it('should insert optional params into path with many params', () => {
    expect(
      insertParamsIntoPath({
        path: '/post/:id?/comments/:commentId?/:commentId2?',
        params: { commentId: '2', commentId2: '3', id: '1' },
      }),
    ).toBe('/post/1/comments/2/3');
  });

  it('should insert optional params into path with no params', () => {
    expect(
      insertParamsIntoPath({
        path: '/post/:id?/comments/:commentId?/:commentId2?',
        params: {},
      }),
    ).toBe('/post/comments');
  });

  it('should insert not have trailing slashes', () => {
    expect(
      insertParamsIntoPath({
        path: '/post/:id?/comments/:commentId?/:commentId2?/:commentId3?',
        params: {},
      }),
    ).toBe('/post/comments');
  });

  it('should insert optional params into paths with only one param', () => {
    expect(
      insertParamsIntoPath({
        path: '/:id?',
        params: { id: '1' },
      }),
    ).toBe('/1');
  });

  it('should insert numeric zero params into path', () => {
    // Clients coerce params with z.coerce.number(), so numbers reach this helper at runtime
    const params = { id: 0 } as unknown as ParamsFromUrl<'/entity/:id'>;

    expect(insertParamsIntoPath({ path: '/entity/:id', params })).toBe(
      '/entity/0',
    );
  });

  it('should insert numeric zero optional params into path', () => {
    const params = { id: 0 } as unknown as ParamsFromUrl<'/entity/:id?/'>;

    expect(insertParamsIntoPath({ path: '/entity/:id?/', params })).toBe(
      '/entity/0/',
    );
  });

  it('should omit empty optional params from path', () => {
    expect(
      insertParamsIntoPath({
        path: '/post/:id?/comments/:commentId?',
        params: { id: '', commentId: undefined },
      }),
    ).toBe('/post/comments');
  });

  it('should preserve trailing slashes in path', () => {
    expect(
      insertParamsIntoPath({
        path: '/:id/',
        params: { id: '1' },
      }),
    ).toBe('/1/');
  });

  it('should preserve trailing slashes in path with optional params', () => {
    expect(
      insertParamsIntoPath({
        path: '/post/:id?/comments/:commentId?/:commentId2?/:commentId3?/',
        params: {},
      }),
    ).toBe('/post/comments/');
  });
});
