import { Part } from '@myrmidon/cadmus-core';
import { ProperName } from '@myrmidon/cadmus-refs-proper-name';

/**
 * The DistrictLocation part model.
 */
export interface DistrictLocationPart extends Part {
  place: ProperName;
  note?: string;
}

/**
 * The type ID used to identify the DistrictLocationPart type.
 */
export const DISTRICT_LOCATION_PART_TYPEID = 'it.vedph.district-location';

/**
 * JSON schema for the DistrictLocation part.
 * You can use the JSON schema tool at https://jsonschema.net/.
 */
export const DISTRICT_LOCATION_PART_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id:
    'www.vedph.it/cadmus/parts/epigraphy/' +
    DISTRICT_LOCATION_PART_TYPEID +
    '.json',
  type: 'object',
  title: 'DistrictLocationPart',
  required: [
    'id',
    'itemId',
    'typeId',
    'timeCreated',
    'creatorId',
    'timeModified',
    'userId',
    'place',
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
    place: {
      type: 'object',
      required: ['language', 'tag', 'parts'],
      properties: {
        language: {
          type: 'string',
        },
        tag: {
          type: 'string',
        },
        pieces: {
          type: 'array',
          items: {
            anyOf: [
              {
                type: 'object',
                required: ['type', 'value'],
                properties: {
                  type: {
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
        note: {
          type: 'string',
        },
      },
    },
  },
};
