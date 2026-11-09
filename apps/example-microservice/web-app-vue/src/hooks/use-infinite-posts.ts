import { computed } from 'vue';
import { client } from '../api/client';

export const useInfinitePosts = () => {
  const PAGE_SIZE = 5;

  const { data, fetchNextPage, hasNextPage, refetch } =
    client.getPosts.useInfiniteQuery(
      ['infinite-posts'],
      ({ pageParam }) => ({
        query: {
          skip: String(pageParam.skip),
          take: String(pageParam.take),
        },
      }),
      {
        initialPageParam: { skip: 0, take: PAGE_SIZE },
        getNextPageParam: (lastPage, allPages) => {
          if (lastPage.status !== 200) return undefined;

          return lastPage.body.count > PAGE_SIZE - 1
            ? { take: PAGE_SIZE, skip: allPages.length * PAGE_SIZE }
            : undefined;
        },
        networkMode: 'offlineFirst',
        staleTime: 1000 * 5,
      },
    );

  const posts = computed(
    () => data.value?.pages?.flatMap((page) => page.body.posts) ?? [],
  );

  return { posts, fetchNextPage, hasNextPage, refetch };
};
