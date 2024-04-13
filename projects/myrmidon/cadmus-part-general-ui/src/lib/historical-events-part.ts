import { Part } from '@myrmidon/cadmus-core';
import { AssertedChronotope } from '@myrmidon/cadmus-refs-asserted-chronotope';
import { AssertedCompositeId } from '@myrmidon/cadmus-refs-asserted-ids';
import { Assertion } from '@myrmidon/cadmus-refs-assertion';

/**
 * The historical events part model.
 */
export interface HistoricalEventsPart extends Part {
  events: HistoricalEvent[];
}

/**
 * Any entity related to an event in the EventsPart.
 */
export interface RelatedEntity {
  relation: string;
  id: AssertedCompositeId;
}

/**
 * An event in the EventsPart.
 */
export interface HistoricalEvent {
  eid: string;
  type: string;
  tag?: string;
  chronotopes?: AssertedChronotope[];
  assertion?: Assertion;
  description?: string;
  relatedEntities?: RelatedEntity[];
  note?: string;
}

/**
 * The type ID used to identify the EventsPart type.
 */
export const HISTORICAL_EVENTS_PART_TYPEID = 'it.vedph.historical-events';

/**
 * JSON schema for the Events part.
 * You can use the JSON schema tool at https://jsonschema.net/.
 */
export const HISTORICAL_EVENTS_PART_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id:
    'www.vedph.it/cadmus/parts/events/' +
    HISTORICAL_EVENTS_PART_TYPEID +
    '.json',
  type: 'object',
  title: 'EventsPart',
  required: [
    'id',
    'itemId',
    'typeId',
    'timeCreated',
    'creatorId',
    'timeModified',
    'userId',
    'events',
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
    events: {
      type: 'array',
      items: {
        anyOf: [
          {
            type: 'object',
            required: ['eid', 'type'],
            properties: {
              eid: {
                type: 'string',
              },
              type: {
                type: 'string',
              },
              tag: {
                type: 'string',
              },
              chronotopes: {
                type: 'array',
                items: {
                  anyOf: [
                    {
                      place: {
                        type: 'object',
                        required: ['value'],
                        properties: {
                          tag: {
                            type: 'string',
                          },
                          value: {
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
                      date: {
                        type: 'object',
                        required: ['value'],
                        properties: {
                          tag: {
                            type: 'string',
                          },
                          date: {
                            type: 'object',
                            required: ['a'],
                            properties: {
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
              description: {
                type: 'string',
              },
              relatedEntities: {
                type: 'array',
                items: {
                  anyOf: [
                    {
                      type: 'object',
                      required: ['relation', 'id'],
                      properties: {
                        relation: {
                          type: 'string',
                        },
                        id: {
                          type: 'object',
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
                    },
                  ],
                },
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
