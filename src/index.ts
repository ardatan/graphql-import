import { loadTypedefsUsingLoaders, OPERATION_KINDS, LoadTypedefsOptions, loadSchemaUsingLoaders } from '@graphql-toolkit/core'
import { UrlLoader } from '@graphql-toolkit/url-loader'
import { JsonFileLoader } from '@graphql-toolkit/json-file-loader'
import { GraphQLFileLoader, GraphQLFileLoaderOptions } from '@graphql-toolkit/graphql-file-loader'
import { CodeFileLoader, CodeFileLoaderOptions } from '@graphql-toolkit/code-file-loader'
import { GitLoader } from '@graphql-toolkit/git-loader'
import { GithubLoader } from '@graphql-toolkit/github-loader'
import { ApolloEngineLoader } from '@graphql-toolkit/apollo-engine-loader'
import { PrismaLoader } from '@graphql-toolkit/prisma-loader'
import { print, BuildSchemaOptions } from 'graphql'
import { mergeTypeDefs } from '@graphql-toolkit/schema-merging';

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

export const importSchema = async (
  schema: string,
  options: BuildSchemaOptions & LoadTypedefsOptions<CodeFileLoaderOptions | GraphQLFileLoaderOptions> = {},
  out: 'string' | 'DocumentNode' | 'GraphQLSchema' = 'string',
) => {
  if (out === 'GraphQLSchema') {
    return loadSchemaUsingLoaders(DEFAULT_SCHEMA_LOADERS, schema, {...options, forceGraphQLImport: true });
  } else {
    const results = await loadTypedefsUsingLoaders(DEFAULT_SCHEMA_LOADERS, schema, { ...options, forceGraphQLImport: true }, OPERATION_KINDS)
    const mergedDocuments = mergeTypeDefs(results.map(r => r.document))
    if (out === 'DocumentNode') {
      return mergedDocuments
    } else {
      return print(mergedDocuments)
    }
  }
}
