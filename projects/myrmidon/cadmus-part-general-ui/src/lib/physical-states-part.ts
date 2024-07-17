import { Part } from '@myrmidon/cadmus-core';
import { PhysicalState } from '@myrmidon/cadmus-mat-physical-state';

/**
 * The PhysicalStates part model.
 */
export interface PhysicalStatesPart extends Part {
  states: PhysicalState[];
}

/**
 * The type ID used to identify the PhysicalStatesPart type.
 */
export const PHYSICAL_STATES_PART_TYPEID = 'it.vedph.physical-states';

/**
 * JSON schema for the PhysicalStates part.
 * You can use the JSON schema tool at https://jsonschema.net/.
 */
export const PHYSICAL_STATES_PART_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id:
    'www.vedph.it/cadmus/parts/general/' +
    PHYSICAL_STATES_PART_TYPEID +
    '.json',
  type: 'object',
  title: 'PhysicalStatesPart',
  required: [
    'id',
    'itemId',
    'typeId',
    'timeCreated',
    'creatorId',
    'timeModified',
    'userId',
    'states',
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
    states: {
      type: 'array',
      items: {
        anyOf: [
          {
            type: 'object',
            required: ['type'],
            properties: {
              type: {
                type: 'string',
              },
              features: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
              date: {
                type: 'string',
              },
              reporter: {
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
