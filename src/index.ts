import { TypeDefinitionNode, DefinitionNode, parse, print } from 'graphql'
import { flatten, uniqBy } from 'lodash'
import * as fs from 'fs'
import * as path from 'path'
import { completeDefinitionPool } from './definition'

export interface RawModule {
  imports: string[]
  from: string
}

export interface Module {
  importedDefinitions: TypeDefinitionNode[]
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

  const allDefinitions = [
    ...filterTypeDefinitions(document.definitions),
    ...collectDefinitions(sdl, path.dirname(path.resolve(filePath))),
  ]
  document.definitions = uniqBy(allDefinitions, 'name.value')
  return print(document)
}

export function collectDefinitions(sdl: string, dirname: string): TypeDefinitionNode[] {
  const rawModules = parseSDL(sdl)
  const document = parse(sdl)
  const currentTypeDefinitions = filterTypeDefinitions(document.definitions)
  const importedTypeDefinitions = flatten(rawModules.map(m => {
    const filePath = path.resolve(path.join(dirname, m.from))
    const sdl = read(filePath)
    return collectDefinitions(sdl, path.dirname(filePath))
  }))
  const typeDefinitions = currentTypeDefinitions.concat(importedTypeDefinitions)

  return flatten([
    ...typeDefinitions,
    ...rawModules.map(m => importDefinitions(m.imports, importedTypeDefinitions, m.from)),
  ])
}

function importDefinitions(
  imports: string[],
  typeDefinitions: TypeDefinitionNode[],
  schemaPath: string, // needed for better debugging output
): TypeDefinitionNode[] {
  if (imports.includes('*')) {
    return typeDefinitions
  } else {
    const importedDefinitions = typeDefinitions.filter(d =>
      imports.includes(d.name.value),
    )

    return completeDefinitionPool(
      typeDefinitions,
      importedDefinitions,
      importedDefinitions,
      schemaPath,
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
    'UnionTypeDefinition',
    'UnionTypeDefinition',
    'InputObjectTypeDefinition',
  ]
  return definitions
    .filter(d => validKinds.includes(d.kind))
    .map(d => d as TypeDefinitionNode)
}
