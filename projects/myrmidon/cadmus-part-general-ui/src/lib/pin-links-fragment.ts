import { Fragment } from '@myrmidon/cadmus-core';
import { AssertedCompositeId } from '@myrmidon/cadmus-refs-asserted-ids';

/**
 * The pin-based links layer fragment server model.
 */
export interface PinLinksFragment extends Fragment {
  links: AssertedCompositeId[];
}

export const PIN_LINKS_FRAGMENT_TYPEID = 'fr.it.vedph.pin-links';

export const PIN_LINKS_FRAGMENT_SCHEMA = {
  definitions: {},
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id:
    'www.vedph.it/cadmus/fragments/general/' +
    PIN_LINKS_FRAGMENT_TYPEID +
    '.json',
  type: 'object',
  title: 'PinLinksFragment',
  required: ['location', 'links'],
  properties: {
    location: {
      $id: '#/properties/location',
      type: 'string',
    },
    baseText: {
      $id: '#/properties/baseText',
      type: 'string',
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
