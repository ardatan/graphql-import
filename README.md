# graphql-import

[![CircleCI](https://circleci.com/gh/prismagraphql/graphql-import.svg?style=shield)](https://circleci.com/gh/prismagraphql/graphql-import) [![npm version](https://badge.fury.io/js/graphql-import.svg)](https://badge.fury.io/js/graphql-import)

Import &amp; export definitions in GraphQL SDL (also refered to as GraphQL modules)

> There is also a [`graphql-import-loader`](https://github.com/graphcool/graphql-import-loader) for Webpack available.

## Install

```sh
yarn add graphql-import
```

## Usage

```ts
import { importSchema } from 'graphql-import'
import { makeExecutableSchema } from 'graphql-tools'

const typeDefs = importSchema('schema.graphql')
const resolvers = {}

const schema = makeExecutableSchema({ typeDefs, resolvers })
```

## Examples

### Importing specific fields

Assume the following directory structure:

```
.
├── a.graphql
├── b.graphql
└── c.graphql
```

`a.graphql`

```graphql
# import B from "b.graphql"

type A {
  # test 1
  first: String
  second: Float
  b: B
}
```

`b.graphql`

```graphql
# import C from 'c.graphql'

type B {
  c: C
  hello: String!
}
```

`c.graphql`

```graphql
type C {
  id: ID!
}
```

Running `console.log(importSchema('a.graphql'))` produces the following output:

```graphql
type A {
  first: String
  second: Float
  b: B
}

type B {
  c: C
  hello: String!
}

type C {
  id: ID!
}
```

### Extending root fields

It is possible to import from a root field like `Query`;

`queries.graphql`

```graphql
type Query {
  feed: [Post!]!
  drafts: [Post!]!
}
```

`mutations.graphql`

```graphql
type Mutation {
  publish(id: ID!): Post!
  deletePost(id: ID!): Post!
}
```

`schema.graphql`

```graphql
# import Query.* from "queries.graphql"
# import Mutation.publish from "mutations.graphql"
```

Running `console.log(importSchema('schema.graphql'))` produces the following output:

```graphql
type Query {
  feed: [Post!]!
  drafts: [Post!]!
}

type Mutation {
  publish(id: ID!): Post!
}
```

Please refer to [`src/index.test.ts`](https://github.com/graphcool/graphql-import/blob/master/src/index.test.ts) for more examples.

## Development

The [implementation documentation](https://graphql-import.now.sh/) documents how things are implemented under the hood. You can also use the VSCode test setup to debug your code/tests.

## Related topics & next steps

- Static import step as build time
- Namespaces
- Support importing from HTTP endpoints (or [Links](https://github.com/apollographql/apollo-link))
- Create RFC to add import syntax to GraphQL spec

<p align="center"><a href="https://oss.prisma.io"><img src="https://imgur.com/IMU2ERq.png" alt="Prisma" height="170px"></a></p>

