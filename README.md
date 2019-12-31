# graphql-import

[![Discord Chat](https://img.shields.io/discord/625400653321076807)](https://discord.gg/xud7bH9)

## Install

```sh
yarn add graphql-import@beta
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


## Updating from 0.7.x
Install the new version as in `Install` step and after that update your code as in `Usage` step because `importSchema` is not sync anymore and returns promise,. We recommend you to use `async/await` to make the migration simple.
The second parameter is now `options`. 
If you want to provide preresolved type definitions as in `0.7.x`, use the method below;
Before

```ts
const finalSchema = importSchema('somePointer', {
  'mySchema': `
      type Query {
        foo: String
      }
    `
})
```

After
```ts
const finalSchema = await importSchema('somePointer', {
  cache: {
    'mySchema': {
      rawSDL: `
        type Query {
          foo: String
        }
      `
    }
  }
})
```