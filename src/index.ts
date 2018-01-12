import * as fs from 'fs'
import { DefinitionNode, parse, print, TypeDefinitionNode, GraphQLObjectType, ObjectTypeDefinitionNode } from 'graphql'
import { flatten, groupBy } from 'lodash'
import * as path from 'path'

import {
  completeDefinitionPool,
  ValidDefinitionNode,
} from './definition'

/**
 * Describes the information from a single import line
 *
 */
export interface RawModule {
  imports: string[]
  from: string
}

const read = (schema: string, schemas?: { [key: string]: string }) => {
  if (isFile(schema)) {
    return fs.readFileSync(schema, { encoding: 'utf8' })
  }
  return schemas ? schemas[schema] : schema
}

const isFile = f => f.endsWith('.graphql')

/**
 * Parse a single import line and extract imported types and schema filename
 *
 * @param importLine Import line
 * @returns Processed import line
 */
export function parseImportLine(importLine: string): RawModule {
  // Apply regex to import line
  const matches = importLine.match(/^import (\*|(.*)) from ('|")(.*)('|")$/)
  if (!matches || matches.length !== 6 || !matches[4]) {
    throw new Error(`Too few regex matches: ${matches}`)
  }

  // Extract matches into named variables
  const [, wildcard, importsString, , from] = matches

  // Extract imported types
  const imports =
    wildcard === '*' ? ['*'] : importsString.split(',').map(d => d.trim())

  // Return information about the import line
  return { imports, from }
}

/**
 * Parse a schema and analyze all import lines
 *
 * @param sdl Schema to parse
 * @returns Array with collection of imports per import line (file)
 */
export function parseSDL(sdl: string): RawModule[] {
  return sdl
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('# import') || l.startsWith('#import'))
    .map(l => l.replace('#', '').trim())
    .map(parseImportLine)
}

/**
 * Main entry point. Recursively process all import statement in a schema
 *
 * @param filePath File path to the initial schema file
 * @returns Single bundled schema with all imported types
 */
export function importSchema(schema: string, schemas?: { [key: string]: string }): string {
  const sdl = read(schema, schemas) || schema
  const document = parse(sdl, { noLocation: true })

  // Recursively process the imports, starting by importing all types from the initial schema
  let { allDefinitions, typeDefinitions } = collectDefinitions(
    ['*'],
    sdl,
    schema,
    schemas
  )

  // Post processing of the final schema (missing types, unused types, etc.)
  // Query, Mutation and Subscription should be merged
  // And should always be in the first set, to make sure they
  // are not filtered out.
  const typesToFilter = ['Query', 'Mutation', 'Subscription']
  const firstTypes = flatten(typeDefinitions).filter(d => typesToFilter.includes(d.name.value))
  const otherFirstTypes = typeDefinitions[0].filter(d => !typesToFilter.includes(d.name.value))
  const firstSet = otherFirstTypes.concat(firstTypes)
  const processedTypeNames = []
  const mergedFirstTypes = []
  for (const type of firstSet) {
    if (!processedTypeNames.includes(type.name.value)) {
      processedTypeNames.push(type.name.value)
      mergedFirstTypes.push(type)
    } else {
      const existingType = mergedFirstTypes.find(t => t.name.value === type.name.value)
      existingType.fields = existingType.fields.concat((type as ObjectTypeDefinitionNode).fields)
    }
  }

  document.definitions = completeDefinitionPool(
    flatten(allDefinitions),
    firstSet,
    flatten(typeDefinitions),
  )

  // Return the schema as string
  return print(document)
}
/**
 * Recursively process all schema files. Keeps track of both the filtered
 * type definitions, and all type definitions, because they might be needed
 * in post-processing (to add missing types)
 *
 * @param imports Types specified in the import statement
 * @param sdl Current schema
 * @param filePath File location for current schema
 * @param Tracking of processed schemas (for circular dependencies)
 * @param Tracking of imported type definitions per schema
 * @param Tracking of all type definitions per schema
 * @returns Both the collection of all type definitions, and the collection of imported type definitions
 */
function collectDefinitions(
  imports: string[],
  sdl: string,
  filePath: string,
  schemas?: { [key: string]: string },
  processedFiles: Set<string> = new Set(),
  typeDefinitions: ValidDefinitionNode[][] = [],
  allDefinitions: ValidDefinitionNode[][] = []
): {
  allDefinitions: ValidDefinitionNode[][]
  typeDefinitions: ValidDefinitionNode[][]
} {
  const key = isFile(filePath) ? path.resolve(filePath) : filePath
  const dirname = path.dirname(filePath)

  // Get TypeDefinitionNodes from current schema
  const document = parse(sdl)

  // Add all definitions to running total
  allDefinitions.push(filterTypeDefinitions(document.definitions))

  // Filter TypeDefinitionNodes by type and defined imports
  const currentTypeDefinitions = filterImportedDefinitions(
    imports,
    document.definitions
  )

  // Add typedefinitions to running total
  typeDefinitions.push(currentTypeDefinitions)

  // Mark file as processed (for circular dependency cases)
  processedFiles.add(key)

  // Read imports from current file
  const rawModules = parseSDL(sdl)

  // Process each file (recursively)
  rawModules.forEach(m => {
    // If it was not yet processed (in case of circular dependencies)
    const moduleFilePath = isFile(filePath) ? path.resolve(path.join(dirname, m.from)) : m.from
    if (!processedFiles.has(moduleFilePath)) {
      collectDefinitions(
        m.imports,
        read(moduleFilePath, schemas),
        moduleFilePath,
        schemas,
        processedFiles,
        typeDefinitions,
        allDefinitions
      )
    }
  })

  // Return the maps of type definitions from each file
  return { allDefinitions, typeDefinitions }
}

/**
 * Filter the types loaded from a schema, first by relevant types,
 * then by the types specified in the import statement.
 *
 * @param imports Types specified in the import statement
 * @param typeDefinitions All definitions from a schema
 * @returns Filtered collection of type definitions
 */
function filterImportedDefinitions(
  imports: string[],
  typeDefinitions: DefinitionNode[]
): ValidDefinitionNode[] {

  // This should do something smart with fields

  const filteredDefinitions = filterTypeDefinitions(typeDefinitions)

  if (imports.includes('*')) {
    return filteredDefinitions
  } else {
    const result = filteredDefinitions.filter(d => imports.map(i => i.split('.')[0]).includes(d.name.value))
    const fieldImports = imports
      .filter(i => i.split('.').length > 1)
    const groupedFieldImports = groupBy(fieldImports, x => x.split('.')[0])

    for (const rootType in groupedFieldImports) {
      const fields = groupedFieldImports[rootType].map(x => x.split('.')[1]);
      (filteredDefinitions.find(def => def.name.value === rootType) as ObjectTypeDefinitionNode).fields =
        (filteredDefinitions.find(def => def.name.value === rootType) as ObjectTypeDefinitionNode).fields
          .filter(f => fields.includes(f.name.value) || fields.includes('*'))
    }

    return result
  }
}

/**
 * Filter relevant definitions from schema
 *
 * @param definitions All definitions from a schema
 * @returns Relevant type definitions
 */
function filterTypeDefinitions(
  definitions: DefinitionNode[]
): ValidDefinitionNode[] {
  const validKinds = [
    'DirectiveDefinition',
    'ScalarTypeDefinition',
    'ObjectTypeDefinition',
    'InterfaceTypeDefinition',
    'EnumTypeDefinition',
    'UnionTypeDefinition',
    'InputObjectTypeDefinition'
  ]
  return definitions
    .filter(d => validKinds.includes(d.kind))
    .map(d => d as ValidDefinitionNode)
}
