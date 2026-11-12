# Solid microservice example

This frontend calls the posts example service, which calls the users service.

## Running locally

From the repository root, use the Node and pnpm versions in `.nvmrc` and
`package.json`, then install the workspace dependencies:

```sh
nvm use
pnpm install --frozen-lockfile
```

Start both services and all three frontends together:

```sh
pnpm example-microservice:serve
```

Open [http://localhost:5005](http://localhost:5005). The users service listens
on port 5002 and the posts service on port 5003.

To start only this frontend, run the following from the repository root. The
backend services must already be running.

```sh
pnpm --filter example-microservice-web-app-solid dev
```

## Service endpoints

The users service accepts `PORT` (default `5002`). The posts service accepts
`PORT`, then the existing lowercase `port` input (default `5003`), and reads
`USERS_API_BASE_URL` (default `http://localhost:5002`) when calling users.
This frontend reads `VITE_POSTS_API_BASE_URL` (default `http://localhost:5003`)
at development startup or build time.

For alternate ports, start the services in separate terminals from the root:

```sh
PORT=6502 pnpm --filter example-microservice-users-service dev
PORT=6503 USERS_API_BASE_URL=http://localhost:6502 pnpm --filter example-microservice-posts-service dev
VITE_POSTS_API_BASE_URL=http://localhost:6503 pnpm --filter example-microservice-web-app-solid dev
```

## Building

```sh
pnpm --filter example-microservice-web-app-solid build
```

The production build writes to this application's `dist` directory.
