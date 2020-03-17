![IMPORT_1](https://user-images.githubusercontent.com/25294569/76310705-fc621b00-62d7-11ea-9643-1670cfe6be18.gif)
# graphql-import

[![Discord Chat](https://img.shields.io/discord/625400653321076807)](https://discord.gg/xud7bH9)

## Install

```sh
yarn add graphql-import
```

## Usage

```ts
import { importSchema } from 'graphql-import'
import { makeExecutableSchema } from 'graphql-tools'

const typeDefs = importSchema('schema.graphql'); // or .gql or glob pattern like **/*.graphql
const resolvers = {};

const schema = makeExecutableSchema({ typeDefs, resolvers });

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

Running `importSchema('schema.graphql')` produces the following output:

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
