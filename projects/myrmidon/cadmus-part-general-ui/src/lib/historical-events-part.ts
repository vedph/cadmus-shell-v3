import { Part } from '@myrmidon/cadmus-core';
import { AssertedChronotope } from '@myrmidon/cadmus-refs-asserted-chronotope';
import { AssertedCompositeId } from '@myrmidon/cadmus-refs-asserted-ids';
import { Assertion } from '@myrmidon/cadmus-refs-assertion';
import { ThesOrTaxoSettings } from '@myrmidon/cadmus-ui-thestaxo';

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
 * Settings for the historical events part editor. These are stored in the
 * app settings under the part type ID (for all the editors of this part
 * type), or under the part type ID plus `_` and a role ID (for the editors
 * of the part with that role). Role-specific settings, when present,
 * replace the global ones.
 */
export interface HistoricalEventsPartSettings {
  /**
   * Settings for the event type picker. By default, the type is picked
   * from the `event-types` thesaurus, displayed as a tree.
   */
  eventType?: ThesOrTaxoSettings;
  /**
   * Settings for the relation picker of related entities. By default, the
   * relation is picked from the `event-relations` thesaurus, displayed as
   * a list.
   */
  relation?: ThesOrTaxoSettings;
  /**
   * How relations are filtered according to the event type. This applies
   * only when relations are picked from a thesaurus.
   */
  relationFilter?: HistoricalEventRelationFilter;
}

/**
 * The default settings for the event type picker: thesaurus mode using the
 * `event-types` thesaurus entries, displayed as a tree.
 */
export const DEFAULT_EVENT_TYPE_SETTINGS: Readonly<ThesOrTaxoSettings> = {
  mode: 'thesaurus',
  thesaurusView: 'tree',
};

/**
 * The default settings for the relation picker: thesaurus mode using the
 * `event-relations` thesaurus entries, displayed as a list.
 */
export const DEFAULT_RELATION_SETTINGS: Readonly<ThesOrTaxoSettings> = {
  mode: 'thesaurus',
  thesaurusView: 'flat',
};

/**
 * How the relations available for the entities related to an event are
 * filtered according to the event type. By default, the type ID is turned
 * into a prefix, and only the relations whose ID starts with it are
 * available: e.g. type `person.birth` gives prefix `person:birth:`, which
 * matches relations like `person:birth:mother` and `person:birth:father`.
 * The prefix is built by splitting the type ID at each `typeSeparator`,
 * removing `tailCut` portions from its end, and joining the remaining
 * portions with `relationSeparator`, plus a final `relationSeparator`.
 */
export interface HistoricalEventRelationFilter {
  /**
   * The filter mode: `prefix` (default) to filter relations by the prefix
   * built from the event type, or `none` to always show all the relations.
   * Use `none` when type IDs and relation IDs do not share the same
   * hierarchy, e.g. when types come from a taxonomy whose keys do not
   * follow this convention.
   */
  mode?: 'prefix' | 'none';
  /**
   * The separator between the portions of a type ID. Default is `.`.
   */
  typeSeparator?: string;
  /**
   * The separator between the portions of a relation ID. Default is `:`.
   */
  relationSeparator?: string;
  /**
   * The number of portions to cut from the end of the type ID when building
   * the prefix. Default is 0. For instance, with 1 the type
   * `person.job.bishop` gives prefix `person:job:`, so that all the jobs
   * share the same relations.
   */
  tailCut?: number;
  /**
   * The last portion of the type IDs which represent parent entries, e.g.
   * `-` for `person.job.-`. Such a portion is always cut, in addition to
   * `tailCut`. Default is `-`. Set to an empty string to disable.
   */
  parentSuffix?: string;
  /**
   * What to do when no relation matches the prefix: when false (default),
   * no relation is available, so it must be typed; when true, all the
   * relations are available.
   */
  fallbackToAll?: boolean;
}

/**
 * The default relation filter.
 */
export const DEFAULT_RELATION_FILTER: Readonly<
  Required<HistoricalEventRelationFilter>
> = {
  mode: 'prefix',
  typeSeparator: '.',
  relationSeparator: ':',
  tailCut: 0,
  parentSuffix: '-',
  fallbackToAll: false,
};

/**
 * Merge the specified relation filter over the defaults, ignoring its
 * undefined or null properties.
 * @param filter The filter.
 * @param tailCut The default tail cut, used when filter has none.
 * @returns The complete filter.
 */
export function resolveRelationFilter(
  filter?: HistoricalEventRelationFilter | null,
  tailCut?: number,
): Required<HistoricalEventRelationFilter> {
  const result = { ...DEFAULT_RELATION_FILTER };
  if (tailCut !== undefined && tailCut !== null && tailCut >= 0) {
    result.tailCut = tailCut;
  }
  for (const [key, value] of Object.entries(filter || {})) {
    if (value !== undefined && value !== null) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

/**
 * Build the prefix matching the relations for the specified event type.
 * @param type The event type ID.
 * @param filter The relation filter.
 * @returns The prefix, or undefined when relations should not be filtered
 * (no type, filter mode `none`, or no portion left after cutting).
 */
export function buildRelationPrefix(
  type: string | null | undefined,
  filter?: HistoricalEventRelationFilter | null,
): string | undefined {
  const f = resolveRelationFilter(filter);
  const id = type?.trim();
  if (!id || f.mode === 'none') {
    return undefined;
  }
  const tokens = f.typeSeparator ? id.split(f.typeSeparator) : [id];
  let cut = Math.max(0, Math.floor(f.tailCut));
  if (f.parentSuffix && tokens.length > 1 && tokens.at(-1) === f.parentSuffix) {
    cut++;
  }
  if (cut >= tokens.length) {
    return undefined;
  }
  tokens.splice(tokens.length - cut, cut);
  return tokens.join(f.relationSeparator) + f.relationSeparator;
}

/**
 * Filter the relation entries for the specified event type.
 * @param entries The relation entries.
 * @param type The event type ID.
 * @param filter The relation filter.
 * @returns The filtered entries.
 */
export function filterRelationEntries<T extends { id: string }>(
  entries: readonly T[] | null | undefined,
  type: string | null | undefined,
  filter?: HistoricalEventRelationFilter | null,
): T[] {
  if (!entries?.length) {
    return [];
  }
  const prefix = buildRelationPrefix(type, filter);
  if (!prefix) {
    return [...entries];
  }
  const filtered = entries.filter((e) => e.id.startsWith(prefix));
  return filtered.length || !resolveRelationFilter(filter).fallbackToAll
    ? filtered
    : [...entries];
}

/**
 * JSON schema for the Events part.
 * You can use the JSON schema tool at https://jsonschema.net/.
 */
export const HISTORICAL_EVENTS_PART_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id:
    'www.vedph.it/cadmus/parts/general/' +
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
