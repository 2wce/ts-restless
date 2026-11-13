import type { Component } from 'solid-js';

import logo from './logo.svg';
import styles from './App.module.css';
import { postsApi } from '@ts-restless/example-microservice-util-posts-api';
import { initQueryClient } from '@ts-restless/solid-query';
import { ApiFetcherArgs, tsRestFetchApi } from '@ts-restless/core';

const client = initQueryClient(postsApi, {
  baseUrl: import.meta.env.VITE_POSTS_API_BASE_URL ?? 'http://localhost:5003',
  baseHeaders: {},
  api: async (args: ApiFetcherArgs & { test?: string }) => {
    return tsRestFetchApi(args);
  },
});

const App: Component = () => {
  const updatePostThumbnail = client.updatePostThumbnail.createMutation({});

  const data = client.getPosts.createQuery(() => ['posts'], {
    query: {},
    test: 'hi',
  });

  console.log(data.data);

  return (
    <div class={styles.App}>
      <header class={styles.header}>
        <img src={logo} class={styles.logo} alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          class={styles.link}
          href="https://github.com/solidjs/solid"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn Solid
        </a>
      </header>
    </div>
  );
};

export default App;
