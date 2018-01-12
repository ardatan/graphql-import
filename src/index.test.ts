import test from 'ava'
import { parseImportLine, parseSDL, importSchema } from '.'

test('parseImportLine: parse single import', t => {
  t.deepEqual(parseImportLine(`import A from "schema.graphql"`), {
    imports: ['A'],
    from: 'schema.graphql',
  })
})

test('parseImportLine: invalid', t => {
  t.throws(() => parseImportLine(`import from "schema.graphql"`), Error)
})

test('parseImportLine: invalid 2', t => {
  t.throws(() => parseImportLine(`import A from ""`), Error)
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
`
  t.is(importSchema('fixtures/field-types/a.graphql'), expectedSDL)
})

test('importSchema: enums', t => {
  const expectedSDL = `\
type A {
  first: String
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
  first: String
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

test('importSchema: import all from objects', t => {
  const schemaC = `
    type C1 {
      id: ID!
    }

    type C2 {
      id: ID!
    }

    type C3 {
      id: ID!
    }`

  const schemaB = `
    # import * from 'schemaC'

    type B {
      hello: String!
      c1: C1
      c2: C2
    }`

  const schemaA = `
    # import B from 'schemaB'

    type A {
      # test 1
      first: String
      second: Float
      b: B
    }`

  const schemas = {
    schemaA, schemaB, schemaC
  }

  const expectedSDL = `\
type A {
  first: String
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
  t.is(importSchema(schemaA, schemas), expectedSDL)
})

test(`importSchema: single object schema`, t => {
  const schemaA = `
    type A {
      field: String
    }`

  const expectedSDL = `\
type A {
  field: String
}
`

  t.is(importSchema(schemaA), expectedSDL)
})

test(`importSchema: import all mix 'n match`, t => {
  const schemaB = `
    # import C1, C2 from 'fixtures/import-all/c.graphql'

    type B {
      hello: String!
      c1: C1
      c2: C2
    }`

  const schemaA = `
    # import * from "schemaB"

    type A {
      # test 1
      first: String
      second: Float
      b: B
    }`

  const schemas = {
    schemaB
  }

  const expectedSDL = `\
type A {
  first: String
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
  t.is(importSchema(schemaA, schemas), expectedSDL)
})

test(`importSchema: import all mix 'n match 2`, t => {

  const schemaA = `
    # import * from "fixtures/import-all/b.graphql"

    type A {
      # test 1
      first: String
      second: Float
      b: B
    }`

  const expectedSDL = `\
type A {
  first: String
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
  t.is(importSchema(schemaA), expectedSDL)
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

test('importSchema: directive', t => {
  const expectedSDL = `\
type A {
  first: String @upper
  second: String @withB @deprecated
}

directive @upper on FIELD_DEFINITION

scalar B

directive @withB(argB: B) on FIELD_DEFINITION
`
  t.is(importSchema('fixtures/directive/a.graphql'), expectedSDL)
})

test('importSchema: interfaces', t => {
  const expectedSDL = `\
type A implements B {
  first: String
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
  first(b: B): String
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
  first: String
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
  first: String
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

test('root field imports', t => {
  const expectedSDL = `\
type Dummy {
  field: String
}

type Query {
  posts(filter: PostFilter): [Post]
}

type Post {
  field1: String
}

input PostFilter {
  field3: Int
}
`
  const actualSDL = importSchema('fixtures/root-fields/a.graphql')
  t.is(actualSDL, expectedSDL)
})

test('merged root field imports', t => {
  const expectedSDL = `\
type Dummy {
  field: String
}

type Query {
  helloA: String
  posts(filter: PostFilter): [Post]
  hello: String
}

type Post {
  field1: String
}

input PostFilter {
  field3: Int
}
`
  const actualSDL = importSchema('fixtures/merged-root-fields/a.graphql')
  t.is(actualSDL, expectedSDL)
})

test('missing type on type', t => {
  const err = t.throws(() => importSchema('fixtures/type-not-found/a.graphql'), Error)
  t.is(err.message, `Field test: Couldn't find type Post in any of the schemas.`)
})

test('missing type on interface', t => {
  const err = t.throws(() => importSchema('fixtures/type-not-found/b.graphql'), Error)
  t.is(err.message, `Field test: Couldn't find type Post in any of the schemas.`)
})

test('missing type on input type', t => {
  const err = t.throws(() => importSchema('fixtures/type-not-found/c.graphql'), Error)
  t.is(err.message, `Field post: Couldn't find type Post in any of the schemas.`)
})

test('missing interface type', t => {
  const err = t.throws(() => importSchema('fixtures/type-not-found/d.graphql'), Error)
  t.is(err.message, `Couldn't find interface MyInterface in any of the schemas.`)
})

test('missing union type', t => {
  const err = t.throws(() => importSchema('fixtures/type-not-found/e.graphql'), Error)
  t.is(err.message, `Couldn't find type C in any of the schemas.`)
})

test('missing type on input type', t => {
  const err = t.throws(() => importSchema('fixtures/type-not-found/f.graphql'), Error)
  t.is(err.message, `Field myfield: Couldn't find type Post in any of the schemas.`)
})

test('missing type on directive', t => {
  const err = t.throws(() => importSchema('fixtures/type-not-found/g.graphql'), Error)
  t.is(err.message, `Directive first: Couldn't find type first in any of the schemas.`)
})
