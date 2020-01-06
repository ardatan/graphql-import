import { loadTypedefs, OPERATION_KINDS, LoadTypedefsOptions, loadSchema } from '@graphql-toolkit/core'
import { UrlLoader } from '@graphql-toolkit/url-loader'
import { JsonFileLoader } from '@graphql-toolkit/json-file-loader'
import { GraphQLFileLoader } from '@graphql-toolkit/graphql-file-loader'
import { CodeFileLoader, CodeFileLoaderOptions } from '@graphql-toolkit/code-file-loader'
import { GitLoader } from '@graphql-toolkit/git-loader'
import { GithubLoader } from '@graphql-toolkit/github-loader'
import { ApolloEngineLoader } from '@graphql-toolkit/apollo-engine-loader'
import { PrismaLoader } from '@graphql-toolkit/prisma-loader'
import { print, BuildSchemaOptions, DocumentNode, GraphQLSchema } from 'graphql'
import { mergeTypeDefs } from '@graphql-toolkit/schema-merging'

const DEFAULT_SCHEMA_LOADERS = [
  new UrlLoader(),
  new JsonFileLoader(),
  new GraphQLFileLoader(),
  new CodeFileLoader(),
  new GitLoader(),
  new GithubLoader(),
  new ApolloEngineLoader(),
  new PrismaLoader()
]

export async function importSchema(
  schema: string,
  options: BuildSchemaOptions & Partial<LoadTypedefsOptions<CodeFileLoaderOptions>>,
): Promise<string>
export async function importSchema(
  schema: string,
  options: BuildSchemaOptions & Partial<LoadTypedefsOptions<CodeFileLoaderOptions>>,
  out: 'string',
): Promise<string>
export async function importSchema(
  schema: string,
  options: BuildSchemaOptions & Partial<LoadTypedefsOptions<CodeFileLoaderOptions>>,
  out: 'DocumentNode',
): Promise<DocumentNode>
export async function importSchema(
  schema: string,
  options: BuildSchemaOptions & Partial<LoadTypedefsOptions<CodeFileLoaderOptions>>,
  out: 'GraphQLSchema',
): Promise<GraphQLSchema>
export async function importSchema(
  schema: string,
  options: BuildSchemaOptions & Partial<LoadTypedefsOptions<CodeFileLoaderOptions>> = {},
  out: 'string' | 'DocumentNode' | 'GraphQLSchema' = 'string',
) {

  const allOptions = {
    loaders: DEFAULT_SCHEMA_LOADERS,
    filterKinds: OPERATION_KINDS,
    sort: false,
    forceGraphQLImport: true,
    ...options,
  }

  if (out === 'GraphQLSchema') {
    return loadSchema(schema, allOptions)
  } else {
    const results = await loadTypedefs(schema, allOptions)
    const mergedDocuments = mergeTypeDefs(results.map(r => r.document), { useSchemaDefinition: false })
    if (out === 'DocumentNode') {
      return mergedDocuments
    } else {
      return print(mergedDocuments)
    }
  }
}
