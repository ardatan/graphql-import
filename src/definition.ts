import { keyBy, uniqBy } from 'lodash'
import {
  DocumentNode,
  TypeDefinitionNode,
  ObjectTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  TypeNode,
  NamedTypeNode,
} from 'graphql'

const builtinTypes = ['String', 'Float', 'Int', 'Boolean', 'ID']

export interface DefinitionMap {
  [key: string]: TypeDefinitionNode
}

/**
 * Post processing of all imported type definitions. Loops over each of the
 * imported type definitions, and processes it using collectNewTypeDefinitions.
 *
 * @param allDefinitions All definitions from all schemas
 * @param definitionPool Current definitions (from first schema)
 * @param newTypeDefinitions All imported definitions
 * @returns Final collection of type definitions for the resulting schema
 */
export function completeDefinitionPool(
  allDefinitions: TypeDefinitionNode[],
  definitionPool: TypeDefinitionNode[],
  newTypeDefinitions: TypeDefinitionNode[],
): TypeDefinitionNode[] {
  const visitedDefinitions: { [name: string]: boolean } = {}
  while (newTypeDefinitions.length > 0) {
    const schemaMap: DefinitionMap = keyBy(allDefinitions, d => d.name.value)
    const newDefinition = newTypeDefinitions.shift()
    if (visitedDefinitions[newDefinition.name.value]) {
      continue
    }

    const collectedTypedDefinitions = collectNewTypeDefinitions(
      allDefinitions,
      definitionPool,
      newDefinition,
      schemaMap,
    )
    newTypeDefinitions.push(...collectedTypedDefinitions)
    definitionPool.push(...collectedTypedDefinitions)

    visitedDefinitions[newDefinition.name.value] = true
  }

  return uniqBy(definitionPool, 'name.value')
}

/**
 * Processes a single type definition, and performs a number of checks:
 * - Add missing interface implementations
 * - Add missing referenced types
 * - Remove unused type definitions
 *
 * @param allDefinitions All definitions from all schemas
 * (only used to find missing interface implementations)
 * @param definitionPool Resulting definitions
 * @param newDefinition All imported definitions
 * @param schemaMap Map of all definitions for easy lookup
 * @returns All relevant type definitions to add to the final schema
 */
function collectNewTypeDefinitions(
  allDefinitions: TypeDefinitionNode[],
  definitionPool: TypeDefinitionNode[],
  newDefinition: TypeDefinitionNode,
  schemaMap: DefinitionMap,
): TypeDefinitionNode[] {
  let newTypeDefinitions: TypeDefinitionNode[] = []

  if (newDefinition.kind === 'InputObjectTypeDefinition') {
    newDefinition.fields.forEach(field => {
      const namedType = getNamedType(field.type)
      const typeName = namedType.name.value

      // collect missing argument input types
      if (
        !definitionPool.some(d => d.name.value === typeName) &&
        !builtinTypes.includes(typeName)
      ) {
        const argTypeMatch = schemaMap[typeName]
        if (!argTypeMatch) {
          throw new Error(
            `Field ${field.name.value}: Couldn't find type ${typeName} in any of the schemas.`,
          )
        }
        newTypeDefinitions.push(argTypeMatch)
      }
    })
  }

  if (newDefinition.kind === 'InterfaceTypeDefinition') {
    const interfaceName = newDefinition.name.value
    newDefinition.fields.forEach(field => {
      const namedType = getNamedType(field.type)
      const typeName = namedType.name.value
      if (
        !definitionPool.some(d => d.name.value === typeName) &&
        !builtinTypes.includes(typeName)
      ) {
        const schemaType = schemaMap[typeName] as ObjectTypeDefinitionNode
        if (!schemaType) {
          throw new Error(
            `Field ${field.name.value}: Couldn't find type ${typeName} in any of the schemas.`,
          )
        }
        newTypeDefinitions.push(schemaType)
      }
    })

    const interfaceImplementations = allDefinitions.filter(
      d =>
        d.kind === 'ObjectTypeDefinition' &&
        d.interfaces.some(i => i.name.value === interfaceName),
    )
    newTypeDefinitions.push(...interfaceImplementations)
  }

  if (newDefinition.kind === 'UnionTypeDefinition') {
    newDefinition.types.forEach(type => {
      if (!definitionPool.some(d => d.name.value === type.name.value)) {
        const typeName = type.name.value
        const typeMatch = schemaMap[typeName]
        if (!typeMatch) {
          throw new Error(`Couldn't find type ${typeName} in any of the schemas.`)
        }
        newTypeDefinitions.push(schemaMap[type.name.value])
      }
    })
  }

  if (newDefinition.kind === 'ObjectTypeDefinition') {
    // collect missing interfaces
    newDefinition.interfaces.forEach(int => {
      if (!definitionPool.some(d => d.name.value === int.name.value)) {
        const interfaceName = int.name.value
        const interfaceMatch = schemaMap[interfaceName]
        if (!interfaceMatch) {
          throw new Error(
            `Couldn't find interface ${interfaceName} in any of the schemas.`,
          )
        }
        newTypeDefinitions.push(schemaMap[int.name.value])
      }
    })

    // iterate over all fields
    newDefinition.fields.forEach(field => {
      const namedType = getNamedType(field.type)
      const typeName = namedType.name.value

      // collect missing argument input types
      field.arguments.forEach(argument => {
        const argType = getNamedType(argument.type)
        const argTypeName = argType.name.value
        if (
          !definitionPool.some(d => d.name.value === argTypeName) &&
          !builtinTypes.includes(argTypeName)
        ) {
          const argTypeMatch = schemaMap[argTypeName]
          if (!argTypeMatch) {
            throw new Error(
              `Field ${field.name.value}: Couldn't find type ${
                argTypeName
              } in any of the schemas.`,
            )
          }
          newTypeDefinitions.push(argTypeMatch)
        }
      })

      // collect missing field types
      if (
        !definitionPool.some(d => d.name.value === typeName) &&
        !builtinTypes.includes(typeName)
      ) {
        const schemaType = schemaMap[typeName] as ObjectTypeDefinitionNode
        if (!schemaType) {
          throw new Error(
            `Field ${field.name.value}: Couldn't find type ${typeName} in any of the schemas.`,
          )
        }
        newTypeDefinitions.push(schemaType)
      }
    })
  }

  return newTypeDefinitions
}

/**
 * Nested visitor for a type node to get to the final NamedType
 *
 * @param {TypeNode} type Type node to get NamedTypeNode for
 * @returns {NamedTypeNode} The found NamedTypeNode
 */
function getNamedType(type: TypeNode): NamedTypeNode {
  if (type.kind === 'NamedType') {
    return type
  } else {
    return getNamedType(type.type)
  }
}
