import * as fs from 'fs'
import { DefinitionNode, parse, print, TypeDefinitionNode } from 'graphql'
import { flatten } from 'lodash'
import * as path from 'path'

import { completeDefinitionPool } from './definition'

/**
 * Describes the information from a single import line
 *
 */
export interface RawModule {
  imports: string[]
  from: string
}

/**
 * Read a schema file from disk
 *
 * @param f Filename
 * @returns File contents
 */
const read: (f: string) => string =
  (f: string): string => fs.readFileSync(f, { encoding: 'utf8' })

/**
 * Parse a single import line and extract imported types and schema filename
 *
 * @param importLine Import line
 * @returns Processed import line
 */
export function parseImportLine(importLine: string): RawModule {
  // Apply regex to import line
  const matches = importLine.match(/^import (\*|(.*)) from ('|")(.*)('|")$/)
  if (matches.length !== 6) {
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
export function importSchema(filePath: string): string {
  const sdl = read(filePath)
  const document = parse(sdl, { noLocation: true })

  // Recursively process the imports, starting by importing all types from the initial schema
  let { allDefinitions, typeDefinitions } = collectDefinitions(
    ['*'],
    sdl,
    path.resolve(filePath)
  )

  // Post processing of the final schema (missing types, unused types, etc.)
  document.definitions = completeDefinitionPool(
    flatten(allDefinitions),
    typeDefinitions[0],
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
  processedFiles: Set<string> = new Set(),
  typeDefinitions: TypeDefinitionNode[][] = [],
  allDefinitions: TypeDefinitionNode[][] = []
): {
  allDefinitions: TypeDefinitionNode[][]
  typeDefinitions: TypeDefinitionNode[][]
} {
  const key = path.resolve(filePath)
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
    const moduleFilePath = path.resolve(path.join(dirname, m.from))
    if (!processedFiles.has(moduleFilePath)) {
      collectDefinitions(
        m.imports,
        read(moduleFilePath),
        moduleFilePath,
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
): TypeDefinitionNode[] {
  const filteredDefinitions = filterTypeDefinitions(typeDefinitions)
  if (imports.includes('*')) {
    return filteredDefinitions
  } else {
    return filteredDefinitions.filter(d => imports.includes(d.name.value))
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
): TypeDefinitionNode[] {
  const validKinds = [
    'ScalarTypeDefinition',
    'ObjectTypeDefinition',
    'InterfaceTypeDefinition',
    'EnumTypeDefinition',
    'UnionTypeDefinition',
    'InputObjectTypeDefinition'
  ]
  return definitions
    .filter(d => validKinds.includes(d.kind))
    .map(d => d as TypeDefinitionNode)
}
