# graphql-import

[![Discord Chat](https://img.shields.io/discord/625400653321076807)](https://discord.gg/xud7bH9)

Import &amp; export definitions in GraphQL SDL (also refered to as GraphQL modules)

> There is also a [`graphql-import-loader`](https://github.com/prisma/graphql-import-loader) for Webpack available.

## Install

```sh
yarn add graphql-import
```

## Usage

```ts
import { importSchema } from 'graphql-import'
import { makeExecutableSchema } from 'graphql-tools'

async function start() {
  const typeDefs = await importSchema('schema.graphql'); // or .gql or glob pattern like **/*.graphql
  const resolvers = {};

  const schema = makeExecutableSchema({ typeDefs, resolvers })
}

main().catch(err => console.error(err));
```

Assume the following directory structure:

```
.
├── schema.graphql
├── posts.graphql
└── comments.graphql
```

`schema.graphql`

```graphql
# import Post from "posts.graphql"

type Query {
  posts: [Post]
}
```

`posts.graphql`

```graphql
# import Comment from 'comments.graphql'

type Post {
  comments: [Comment]
  id: ID!
  text: String!
  tags: [String]
}
```

`comments.graphql`

```graphql
type Comment {
  id: ID!
  text: String!
}
```

Running `console.log(await importSchema('schema.graphql'))` produces the following output:

```graphql
type Query {
  posts: [Post]
}

type Post {
  comments: [Comment]
  id: ID!
  text: String!
  tags: [String]
}

type Comment {
  id: ID!
  text: String!
}
```

## [Full documentation](https://oss.prisma.io/content/graphql-import/overview)

## Related topics & next steps

- Static import step as build time
- Namespaces
- Support importing from HTTP endpoints (or [Links](https://github.com/apollographql/apollo-link))
- Create RFC to add import syntax to GraphQL spec

<p align="center"><a href="https://oss.prisma.io"><img src="https://imgur.com/IMU2ERq.png" alt="Prisma" height="170px"></a></p>

