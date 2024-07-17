import { Part } from '@myrmidon/cadmus-core';
import { AssertedId } from '@myrmidon/cadmus-refs-asserted-ids';

/**
 * The external ids part model.
 */
export interface ExternalIdsPart extends Part {
  ids: AssertedId[];
}

/**
 * The type ID used to identify the ExternalIdsPart type.
 */
export const EXTERNAL_IDS_PART_TYPEID = 'it.vedph.external-ids';

/**
 * JSON schema for the external IDs part. This is used in the editor demo.
 * You can use the JSON schema tool at https://jsonschema.net/.
 */
export const EXTERNAL_IDS_PART_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'www.vedph.it/cadmus/parts/general/' + EXTERNAL_IDS_PART_TYPEID + '.json',
  type: 'object',
  title: 'ExternalIdsPart',
  required: [
    'id',
    'itemId',
    'typeId',
    'timeCreated',
    'creatorId',
    'timeModified',
    'userId',
    'ids',
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
    ids: {
      type: 'array',
      items: {
        anyOf: [
          {
            type: 'object',
            required: ['value'],
            properties: {
              value: {
                type: 'string',
              },
              type: {
                type: 'string',
              },
              tag: {
                type: 'string',
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
