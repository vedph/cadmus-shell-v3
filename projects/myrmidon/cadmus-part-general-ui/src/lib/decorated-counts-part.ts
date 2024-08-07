import { Part } from '@myrmidon/cadmus-core';
import { DecoratedCount } from '@myrmidon/cadmus-refs-decorated-counts';

/**
 * The DecoratedCounts part model.
 */
export interface DecoratedCountsPart extends Part {
  counts: DecoratedCount[];
}

/**
 * The type ID used to identify the DecoratedCountsPart type.
 */
export const DECORATED_COUNTS_PART_TYPEID = 'it.vedph.decorated-counts';

/**
 * JSON schema for the DecoratedCounts part.
 * You can use the JSON schema tool at https://jsonschema.net/.
 */
export const DECORATED_COUNTS_PART_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id:
    'www.vedph.it/cadmus/parts/general/' +
    DECORATED_COUNTS_PART_TYPEID +
    '.json',
  type: 'object',
  title: 'DecoratedCountsPart',
  required: [
    'id',
    'itemId',
    'typeId',
    'timeCreated',
    'creatorId',
    'timeModified',
    'userId',
    'counts',
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
    counts: {
      type: 'array',
      items: {
        anyOf: [
          {
            type: 'object',
            required: ['id', 'value'],
            properties: {
              id: {
                type: 'string',
              },
              tag: {
                type: 'string',
              },
              value: {
                type: 'integer',
              },
              note: {
                type: 'string',
              },
            },
          },
        ],
      },
    },
  },
};
