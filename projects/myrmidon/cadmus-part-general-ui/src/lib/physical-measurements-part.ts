import { Part } from '@myrmidon/cadmus-core';
import { PhysicalMeasurement } from '@myrmidon/cadmus-mat-physical-size';

/**
 * The PhysicalMeasurements part model.
 */
export interface PhysicalMeasurementsPart extends Part {
  measurements: PhysicalMeasurement[];
}

/**
 * The type ID used to identify the PhysicalMeasurementsPart type.
 */
export const PHYSICAL_MEASUREMENTS_PART_TYPEID =
  'it.vedph.general.physical-measurements';

/**
 * JSON schema for the PhysicalMeasurements part.
 * You can use the JSON schema tool at https://jsonschema.net/.
 */
export const PHYSICAL_MEASUREMENTS_PART_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id:
    'www.vedph.it/cadmus/parts/general/' +
    PHYSICAL_MEASUREMENTS_PART_TYPEID +
    '.json',
  type: 'object',
  title: 'PhysicalMeasurementsPart',
  required: [
    'id',
    'itemId',
    'typeId',
    'timeCreated',
    'creatorId',
    'timeModified',
    'userId',
    'measurements',
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
    measurements: {
      type: 'array',
      items: {
        anyOf: [
          {
            type: 'object',
            required: ['name', 'value', 'unit'],
            properties: {
              name: {
                type: 'string',
              },
              tag: {
                type: 'string',
              },
              value: {
                type: 'number',
              },
              unit: {
                type: 'string',
              },
            },
          },
        ],
      },
    },
  },
};
