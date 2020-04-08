import { loadTypedefsSync, OPERATION_KINDS, LoadTypedefsOptions, loadSchemaSync, LoadSchemaOptions, UnnormalizedTypeDefPointer } from '@graphql-toolkit/core';
import { UrlLoader } from '@graphql-toolkit/url-loader';
import { JsonFileLoader } from '@graphql-toolkit/json-file-loader';
import { GraphQLFileLoader } from '@graphql-toolkit/graphql-file-loader';
import { CodeFileLoader, CodeFileLoaderOptions } from '@graphql-toolkit/code-file-loader';
import { print, DocumentNode, GraphQLSchema, parse } from 'graphql';
import { mergeTypeDefs } from '@graphql-toolkit/schema-merging';

const DEFAULT_SCHEMA_LOADERS = [
  new UrlLoader(),
  new JsonFileLoader(),
  new GraphQLFileLoader(),
  new CodeFileLoader(),
];

export type ImportSchemaOptions<T = {}> = Partial<LoadSchemaOptions & LoadTypedefsOptions<CodeFileLoaderOptions>> & T;

type PointerOrPointers = UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[];

export function importSchema(
  pointerOrPointers: PointerOrPointers,
  schemas?: { [key: string]: string },
): string;
export function importSchema(
  pointerOrPointers: PointerOrPointers,
  schemas?: { [key: string]: string },
  options?: ImportSchemaOptions<{ out?: 'string' }>,
): string;
export function importSchema(
  pointerOrPointers: PointerOrPointers,
  schemas?: { [key: string]: string },
  options?: ImportSchemaOptions<{ out: 'DocumentNode' }>,
): DocumentNode;
export function importSchema(
  pointerOrPointers: PointerOrPointers,
  schemas?: { [key: string]: string },
  options?: ImportSchemaOptions<{ out: 'GraphQLSchema' }>,
): GraphQLSchema;
export function importSchema(
  pointerOrPointers: PointerOrPointers,
  schemas?: { [key: string]: string },
  options: ImportSchemaOptions = {},
) {

  for (const key in schemas) {
    options.cache = options.cache || {};
    options.cache[key] = {
      rawSDL: schemas[key],
    };
  }

  const allOptions = {
    loaders: DEFAULT_SCHEMA_LOADERS,
    filterKinds: OPERATION_KINDS,
    sort: false,
    forceGraphQLImport: true,
    useSchemaDefinition: false,
    ...options,
  };

  const out = options.out;

  if (out === 'GraphQLSchema') {
    return loadSchemaSync(pointerOrPointers, allOptions);
  } else {
    const results = loadTypedefsSync(pointerOrPointers, allOptions);
    const mergedDocuments = mergeTypeDefs(results.map(r => r.document), allOptions);
    if (out === 'DocumentNode') {
      if (typeof mergedDocuments === 'string') {
        return parse(mergedDocuments);
      } else {
        return mergedDocuments;
      }
    } else {
      if (typeof mergedDocuments === 'string') {
        return mergedDocuments;
      } else if (mergedDocuments) {
        return print(mergedDocuments);
      }
      return '';
    }
  }
}
