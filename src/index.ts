import { TypeDefinitionNode, DefinitionNode, parse, print } from 'graphql'
import { flatten } from 'lodash'
import * as fs from 'fs'
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

  const allDefinitions = collectDefinitions(['*'], sdl, path.resolve(filePath))
  document.definitions = allDefinitions
  return print(document)
}

export function collectDefinitions(
  imports: string[],
  sdl: string,
  filePath: string,
): TypeDefinitionNode[] {
  const dirname = path.dirname(filePath)
  const rawModules = parseSDL(sdl)
  const document = parse(sdl)
  const currentTypeDefinitions = filterTypeDefinitions(document.definitions)
  const importedTypeDefinitions = flatten(
    rawModules.map(m => {
      const moduleFilePath = path.resolve(path.join(dirname, m.from))
      return collectDefinitions(m.imports, read(moduleFilePath), moduleFilePath)
    }),
  )
  const typeDefinitions = currentTypeDefinitions.concat(importedTypeDefinitions)

  const filteredTypeDefinitions = importDefinitions(
    imports,
    typeDefinitions,
    filePath,
  )

  return completeDefinitionPool(
    typeDefinitions,
    filteredTypeDefinitions.slice(0),
    filteredTypeDefinitions.slice(0),
    filePath,
  )
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
      importedDefinitions.slice(0),
      importedDefinitions.slice(0),
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
    'EnumTypeDefinition',
    'UnionTypeDefinition',
    'InputObjectTypeDefinition',
  ]
  return definitions
    .filter(d => validKinds.includes(d.kind))
    .map(d => d as TypeDefinitionNode)
}
