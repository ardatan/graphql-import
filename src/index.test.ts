import test from 'ava'
import { parseImportLine, parseSDL, importSchema } from '.'

test('parseImportLine: parse single import', t => {
  t.deepEqual(parseImportLine(`import A from "schema.graphql"`), {
    imports: ['A'],
    from: 'schema.graphql',
  })
})

test('parseImportLine: parse multi import', t => {
  t.deepEqual(parseImportLine(`import A, B from "schema.graphql"`), {
    imports: ['A', 'B'],
    from: 'schema.graphql',
  })
})

test('parseImportLine: parse multi import (weird spacing)', t => {
  t.deepEqual(parseImportLine(`import  A  ,B   from "schema.graphql"`), {
    imports: ['A', 'B'],
    from: 'schema.graphql',
  })
})

test('parseImportLine: different path', t => {
  t.deepEqual(parseImportLine(`import A from "../new/schema.graphql"`), {
    imports: ['A'],
    from: '../new/schema.graphql',
  })
})

test('parse: multi line import', t => {
  const sdl = `\
# import A from "a.graphql"
# import * from "b.graphql"
  `
  t.deepEqual(parseSDL(sdl), [
    {
      imports: ['A'],
      from: 'a.graphql',
    },
    {
      imports: ['*'],
      from: 'b.graphql',
    },
  ])
})

test('importSchema: field types', t => {
  const expectedSDL = `\
type A {
  first: String @first
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
`
  t.is(importSchema('fixtures/field-types/a.graphql'), expectedSDL)
})

test('importSchema: enums', t => {
  const expectedSDL = `\
type A {
  first: String @first
  second: Float
  b: B
}

enum B {
  B1
  B2
  B3
}
`
  t.is(importSchema('fixtures/enums/a.graphql'), expectedSDL)
})

test('importSchema: import all', t => {
  const expectedSDL = `\
type A {
  first: String @first
  second: Float
  b: B
}

type B {
  hello: String!
  c1: C1
  c2: C2
}

type C1 {
  id: ID!
}

type C2 {
  id: ID!
}
`
  t.is(importSchema('fixtures/import-all/a.graphql'), expectedSDL)
})

test('importSchema: unions', t => {
  const expectedSDL = `\
type A {
  b: B
}

union B = C1 | C2

type C1 {
  c1: ID
}

type C2 {
  c2: ID
}
`
  t.is(importSchema('fixtures/unions/a.graphql'), expectedSDL)
})

test('importSchema: scalar', t => {
  const expectedSDL = `\
type A {
  b: B
}

scalar B
`
  t.is(importSchema('fixtures/scalar/a.graphql'), expectedSDL)
})

test('importSchema: interfaces', t => {
  const expectedSDL = `\
type A implements B {
  first: String @first
  second: Float
}

interface B {
  second: Float
  c: [C!]!
}

type C {
  c: ID!
}
`
  t.is(importSchema('fixtures/interfaces/a.graphql'), expectedSDL)
})

test('importSchema: interfaces-implements', t => {
  const expectedSDL = `\
type A implements B {
  id: ID!
}

interface B {
  id: ID!
}

type B1 implements B {
  id: ID!
}
`
  t.is(importSchema('fixtures/interfaces-implements/a.graphql'), expectedSDL)
})

test('importSchema: input types', t => {
  const expectedSDL = `\
type A {
  first(b: B): String @first
  second: Float
}

input B {
  hello: [C!]!
}

input C {
  id: ID!
}
`
  t.is(importSchema('fixtures/input-types/a.graphql'), expectedSDL)
})

test('importSchema: complex test', t => {
  t.notThrows(() => {
    importSchema('fixtures/complex/a.graphql')
  })
})

test('circular imports', t => {
  const expectedSDL = `\
type A {
  first: String @first
  second: Float
  b: B
}

type B {
  hello: String!
  c1: C1
  c2: C2
  a: A
}

type C1 {
  id: ID!
}

type C2 {
  id: ID!
}
`
  const actualSDL = importSchema('fixtures/circular/a.graphql')
  t.is(actualSDL, expectedSDL)
})

test('related types', t => {
  const expectedSDL = `\
type A {
  first: String @first
  second: Float
  b: B
}

type B {
  hello: String!
  c1: C
}

type C {
  field: String
}
`
  const actualSDL = importSchema('fixtures/related-types/a.graphql')
  t.is(actualSDL, expectedSDL)
})

test('relative paths', t => {
  const expectedSDL = `\
type Query {
  feed: [Post!]!
}

type Mutation {
  createDraft(title: String!, text: String): Post
  publish(id: ID!): Post
}

type Post implements Node {
  id: ID!
  isPublished: Boolean!
  title: String!
  text: String!
}

interface Node {
  id: ID!
}
`
  const actualSDL = importSchema('fixtures/relative-paths/src/schema.graphql')
  t.is(actualSDL, expectedSDL)
})
