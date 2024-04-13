import { Part } from '@myrmidon/cadmus-core';
import { AssertedProperName } from '@myrmidon/cadmus-refs-proper-name';

/**
 * The names part model.
 */
export interface NamesPart extends Part {
  names: AssertedProperName[];
}

/**
 * The type ID used to identify the NamesPart type.
 */
export const NAMES_PART_TYPEID = 'it.vedph.names';

/**
 * JSON schema for the names part.
 * You can use the JSON schema tool at https://jsonschema.net/.
 */
export const NAMES_PART_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'www.vedph.it/cadmus/parts/names/' + NAMES_PART_TYPEID + '.json',
  type: 'object',
  title: 'NamesPart',
  required: [
    'id',
    'itemId',
    'typeId',
    'timeCreated',
    'creatorId',
    'timeModified',
    'userId',
    'names',
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
    names: {
      type: 'array',
      items: {
        anyOf: [
          {
            type: 'object',
            required: ['language', 'pieces'],
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
              assertion: {
                type: 'object',
                required: ['rank'],
                properties: {
                  tag: {
                    type: 'string',
                  },
                  rank: {
                    type: 'integer',
                  },
                  note: {
                    type: 'string',
                  },
                  references: {
                    type: 'array',
                    items: {
                      anyOf: [
                        {
                          type: 'object',
                          required: ['citation'],
                          properties: {
                            type: {
                              type: 'string',
                            },
                            tag: {
                              type: 'string',
                            },
                            citation: {
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
              },
            },
          },
        ],
      },
    },
  },
};
