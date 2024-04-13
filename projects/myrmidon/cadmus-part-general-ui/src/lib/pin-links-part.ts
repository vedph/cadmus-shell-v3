import { Part } from '@myrmidon/cadmus-core';
import { AssertedCompositeId } from '@myrmidon/cadmus-refs-asserted-ids';

/**
 * The PinLinks part model.
 */
export interface PinLinksPart extends Part {
  links: AssertedCompositeId[];
}

/**
 * The type ID used to identify the PinLinksPart type.
 */
export const PIN_LINKS_PART_TYPEID = 'it.vedph.pin-links';

/**
 * JSON schema for the PinLinks part.
 * You can use the JSON schema tool at https://jsonschema.net/.
 */
export const PIN_LINKS_PART_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'www.vedph.it/cadmus/parts/general/' + PIN_LINKS_PART_TYPEID + '.json',
  type: 'object',
  title: 'PinLinksPart',
  required: [
    'id',
    'itemId',
    'typeId',
    'timeCreated',
    'creatorId',
    'timeModified',
    'userId',
    'links',
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
    links: {
      type: 'array',
      items: {
        type: 'object',
        default: {},
        required: ['target'],
        properties: {
          target: {
            type: 'object',
            required: ['gid', 'label'],
            properties: {
              gid: {
                type: 'string',
              },
              label: {
                type: 'string',
              },
              itemId: {
                type: 'string',
              },
              partId: {
                type: 'string',
              },
              partTypeId: {
                type: 'string',
              },
              roleId: {
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
          scope: {
            type: 'string',
          },
          tag: {
            type: 'string',
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
    },
  },
};
