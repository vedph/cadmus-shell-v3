import { Part } from '@myrmidon/cadmus-core';

/**
 * The metadata part model.
 */
export interface MetadataPart extends Part {
  metadata: Metadatum[];
}

/**
 * A metadata entry in MetadataPart.
 */
export interface Metadatum {
  type?: string;
  name: string;
  value: string;
}

/**
 * The type ID used to identify the MetadataPart type.
 */
export const METADATA_PART_TYPEID = 'it.vedph.metadata';

/**
 * JSON schema for the metadata part.
 * You can use the JSON schema tool at https://jsonschema.net/.
 */
export const METADATA_PART_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'www.vedph.it/cadmus/parts/metadata' + METADATA_PART_TYPEID + '.json',
  type: 'object',
  title: 'MetadataPart',
  required: [
    'id',
    'itemId',
    'typeId',
    'timeCreated',
    'creatorId',
    'timeModified',
    'userId',
    'metadata',
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
    metadata: {
      type: 'array',
      items: {
        anyOf: [
          {
            type: 'object',
            required: ['name', 'value'],
            properties: {
              type: {
                type: 'string',
              },
              name: {
                type: 'string',
              },
              value: {
                type: 'string',
              },
            },
          },
        ],
      },
    },
  },
};
