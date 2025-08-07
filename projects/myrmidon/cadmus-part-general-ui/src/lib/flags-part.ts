import { Part } from '@myrmidon/cadmus-core';

/**
 * The flags part model.
 */
export interface FlagsPart extends Part {
  flags: string[];
  notes?: { [key: string]: string };
}

/**
 * The type ID used to identify the FlagsPart type.
 */
export const FLAGS_PART_TYPEID = 'it.vedph.flags';

/**
 * JSON schema for the Flags part.
 * You can use the JSON schema tool at https://jsonschema.net/.
 */
export const FLAGS_PART_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id:
    'www.vedph.it/cadmus/parts/__PRJ__/__LIB__/' + FLAGS_PART_TYPEID + '.json',
  type: 'object',
  title: 'FlagsPart',
  required: [
    'id',
    'itemId',
    'typeId',
    'timeCreated',
    'creatorId',
    'timeModified',
    'userId',
    'flags',
  ],
  properties: {
    timeCreated: {
      type: 'string',
      pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d+Z$',
    },
    creatorId: {
      type: 'string',
    },
    timeModified: {
      type: 'string',
      pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d+Z$',
    },
    userId: {
      type: 'string',
    },
    id: {
      type: 'string',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
    itemId: {
      type: 'string',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
    typeId: {
      type: 'string',
      pattern: '^[a-z][-0-9a-z._]*$',
    },
    roleId: {
      type: ['string', 'null'],
      pattern: '^([a-z][-0-9a-z._]*)?$',
    },
    flags: {
      type: 'array',
      items: {
        type: 'string',
        pattern: '^[a-z][-0-9a-z._]*$',
      },
      minItems: 1,
    },
    notes: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
  },
};
