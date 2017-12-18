import * as fs from 'fs'
import { DefinitionNode, parse, print, TypeDefinitionNode } from 'graphql'
import { flatten } from 'lodash'
import * as path from 'path'

import { completeDefinitionPool } from './definition'

export interface RawModule {
  imports: string[]
  from: string
}

const read = f => fs.readFileSync(f, { encoding: 'utf8' })

export function parseImportLine(importLine: string): RawModule {
  const matches = importLine.match(/^import (\*|(.*)) from ('|")(.*)('|")$/)
  if (matches.length !== 6) {
    throw new Error(`Too few regex matches: ${matches}`)
  }

  const [, wildcard, importsString, , from] = matches
  const imports =
    wildcard === '*' ? ['*'] : importsString.split(',').map(d => d.trim())

  return { imports, from }
}

export function parseSDL(sdl: string): RawModule[] {
  return sdl
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('# import') || l.startsWith('#import'))
    .map(l => l.replace('#', '').trim())
    .map(parseImportLine)
}

export function importSchema(filePath: string): string {
  const sdl = read(filePath)
  const document = parse(sdl)

  let { allDefinitions, typeDefinitions } = collectDefinitions(['*'], sdl, path.resolve(filePath))

  document.definitions = completeDefinitionPool(
    flatten(allDefinitions),
    flatten(typeDefinitions),
    flatten(typeDefinitions),
    'any of the schemas'
  )

  return print(document)
}

function collectDefinitions(
  imports: string[],
  sdl: string,
  filePath: string,
  processedFiles: Set<string> = new Set(),
  typeDefinitions: TypeDefinitionNode[][] = [],
  allDefinitions: TypeDefinitionNode[][] = [],
): { allDefinitions: TypeDefinitionNode[][], typeDefinitions: TypeDefinitionNode[][]} {

  const key = path.basename(filePath)
  const dirname = path.dirname(filePath)

  // Get TypeDefinitionNodes from current schema
  const document = parse(sdl)

  // Add all definitions to running total
  allDefinitions.push(filterTypeDefinitions(document.definitions))

  // Filter TypeDefinitionNodes by type and defined imports
  const currentTypeDefinitions = filterImportedDefinitions(imports, document.definitions)

  // Add typedefinitions to running total
  typeDefinitions.push(currentTypeDefinitions)

  // Mark file as processed (for circular dependency cases)
  processedFiles.add(key)

  // Read imports from current file
  const rawModules = parseSDL(sdl)

  // Process each file (recursively)
  rawModules.forEach(m => {
    // If it was not yet processed (in case of circular dependencies)
    if (!processedFiles.has(path.basename(m.from))) {
      const moduleFilePath = path.resolve(path.join(dirname, m.from))
      collectDefinitions(m.imports, read(moduleFilePath), moduleFilePath, processedFiles, typeDefinitions, allDefinitions)
    }
  })

  // Return the maps of type definitions from each file
  return { allDefinitions, typeDefinitions }
}

function filterImportedDefinitions(
  imports: string[],
  typeDefinitions: DefinitionNode[]
): TypeDefinitionNode[] {
  const filteredDefinitions = filterTypeDefinitions(typeDefinitions)
  if (imports.includes('*')) {
    return filteredDefinitions
  } else {
    return filteredDefinitions.filter(d =>
      imports.includes(d.name.value)
    )
  }
}

function filterTypeDefinitions(
  definitions: DefinitionNode[],
): TypeDefinitionNode[] {
  const validKinds = [
    'ScalarTypeDefinition',
    'ObjectTypeDefinition',
    'InterfaceTypeDefinition',
    'EnumTypeDefinition',
    'UnionTypeDefinition',
    'InputObjectTypeDefinition',
  ]
  return definitions
    .filter(d => validKinds.includes(d.kind))
    .map(d => d as TypeDefinitionNode)
}
