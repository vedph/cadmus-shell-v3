import { Part } from '@myrmidon/cadmus-core';
import { AssertedHistoricalDate } from '@myrmidon/cadmus-refs-asserted-chronotope';

/**
 * The AssertedHistoricalDates part model.
 */
export interface AssertedHistoricalDatesPart extends Part {
  dates: AssertedHistoricalDate[];
}

/**
 * The type ID used to identify the AssertedHistoricalDatesPart type.
 */
export const ASSERTED_HISTORICAL_DATES_PART_TYPEID =
  'it.vedph.asserted-historical-dates';

/**
 * JSON schema for the AssertedHistoricalDates part.
 * You can use the JSON schema tool at https://jsonschema.net/.
 */
export const ASSERTED_HISTORICAL_DATES_PART_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id:
    'www.vedph.it/cadmus/parts/general/' +
    ASSERTED_HISTORICAL_DATES_PART_TYPEID +
    '.json',
  type: 'object',
  title: 'AssertedHistoricalDatesPart',
  required: [
    'id',
    'itemId',
    'typeId',
    'timeCreated',
    'creatorId',
    'timeModified',
    'userId',
    'dates',
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
    dates: {
      type: 'array',
      items: {
        anyOf: [
          {
            type: 'object',
            required: ['a'],
            properties: {
              tag: {
                type: 'string',
              },
              a: {
                type: 'object',
                required: ['value'],
                properties: {
                  value: {
                    type: 'integer',
                  },
                  isCentury: {
                    type: 'boolean',
                  },
                  isSpan: {
                    type: 'boolean',
                  },
                  isApproximate: {
                    type: 'boolean',
                  },
                  isDubious: {
                    type: 'boolean',
                  },
                  day: {
                    type: 'integer',
                  },
                  month: {
                    type: 'integer',
                  },
                  hint: {
                    type: ['string', 'null'],
                  },
                },
              },
              b: {
                type: 'object',
                required: ['value'],
                properties: {
                  value: {
                    type: 'integer',
                  },
                  isCentury: {
                    type: 'boolean',
                  },
                  isSpan: {
                    type: 'boolean',
                  },
                  isApproximate: {
                    type: 'boolean',
                  },
                  isDubious: {
                    type: 'boolean',
                  },
                  day: {
                    type: 'integer',
                  },
                  month: {
                    type: 'integer',
                  },
                  hint: {
                    type: ['string', 'null'],
                  },
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
