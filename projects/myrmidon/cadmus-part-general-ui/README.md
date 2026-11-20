# CadmusPartGeneralUi

- 📦 `@myrmidon/cadmus-part-general-ui`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.0.

This library contains the components for editing general Cadmus parts and fragments.

## Historical Events Part

- 🔑 `it.vedph.historical-events`
- 🟢 `HistoricalEventsPartComponent`, `HistoricalEventEditorComponent`, `RelatedEntityComponent`

Each event has an ID, a type, an optional tag, description and note, any number of chronotopes, an optional assertion, and any number of **related entities**, each with a relation (e.g. father) and an entity ID.

### Editor

The event editor has two tabs:

- _general_: ID, tag, description and note, side by side with the type when the editor is wide enough; and below, the chronotopes and the assertion. The tab label shows an error icon when any of its fields is invalid.
- _related_: the related entities, with their relation labels and entities. The tab label shows their count, and a warning icon when some relations do not fit the event type (see [Relations](#relations)): these entities are also marked in the list. While an entity is being edited, adding another is disabled, and a note below reminds that it is not yet saved.

The layout adapts to the width of the editor itself rather than to that of the window (CSS container queries), as the editor is usually nested in the part editor.

### Settings

The editor gets its **settings** from the `settings` object of the profile, either under the part type ID (for all the historical events parts), or under the part type ID plus `_` and a role ID (for the parts with that role only). Role-specific settings, when present, replace the global ones. With no settings, the editor behaves as it always did.

Settings (`HistoricalEventsPartSettings`) have these properties, all optional:

- `eventType` (`ThesOrTaxoSettings`): how the [event type](#event-type) is picked.
- `relation` (`ThesOrTaxoSettings`): how the relation of related entities is picked (see [Relations](#relations)).
- `relationFilter` (`HistoricalEventRelationFilter`): how relations are filtered by the event type (see [Relations](#relations)).

Both `eventType` and `relation` are settings for a `ThesOrTaxoPicker` (from [@myrmidon/cadmus-ui-thestaxo](../cadmus-ui-thestaxo/README.md)), whose properties override the defaults:

- `mode`: `thesaurus` (default), `taxonomy`, or `unbound`.
- `source`: the thesaurus ID (when not set, the thesaurus of the part is used: `event-types` or `event-relations`), or the taxonomy tree ID.
- `thesaurusView`: `flat`, `tree`, or `auto` (a tree only when entry IDs include dots). The default is `tree` for types and `flat` for relations.
- `hasTopNodeFilter`: true (default) to show the top-level nodes filter in the taxonomy picker.
- `canEditNode`, `canAddNode`, `canDeleteNode`: whether users can edit, add or delete taxonomy nodes while picking. Default is false.

Taxonomy mode requires the TaxoStore API, whose base URL is set by `taxoUrl` in the app's `env.js`.

### Event Type

By default, the type is picked from the `event-types` thesaurus, displayed as a tree. When this thesaurus is not available, the type is typed in a textbox. You can rather pick it from another thesaurus, or from a [TaxoStore](https://github.com/vedph/taxo-store) taxonomy (e.g. when types come from a rich LOD ontology), via `eventType`.

New events get the first thesaurus entry as their default type only in thesaurus mode.

### Relations

By default, the relation of a related entity is picked from the `event-relations` thesaurus, displayed as a list, or typed when this thesaurus is not available. You can rather pick it from another thesaurus, or from a taxonomy, via `relation`.

When relations come from a thesaurus, they are **filtered by the event type**, so that only the relations fit for the type are available. The type ID is turned into a prefix, and only the relations whose ID starts with it are listed: e.g. type `person.birth` gives prefix `person:birth:`, which matches `person:birth:father` and `person:birth:mother`. The prefix is built by:

1. splitting the type ID at each `typeSeparator` (`person.birth` → `person`, `birth`);
2. removing `tailCut` portions from its end. Also, when the last portion is `parentSuffix` (as in `person.job.-`, the convention for parent entries), it is always removed;
3. joining the remaining portions with `relationSeparator`, plus a final `relationSeparator` (`person:birth:`).

When no portion is left, relations are not filtered.

The `relationFilter` setting configures this behavior:

- `mode`: `prefix` (default) to filter relations by the prefix built from the type, or `none` to always list all the relations. Use `none` when type IDs and relation IDs do not share the same hierarchy, e.g. with types from a taxonomy whose keys do not follow this convention.
- `typeSeparator`: the separator between the portions of a type ID. Default is `.`. Set it according to the keys of your taxonomy, e.g. `/` for keys like `person/birth`.
- `relationSeparator`: the separator between the portions of a relation ID. Default is `:`.
- `tailCut`: the number of portions to cut from the end of the type ID. Default is 0. For instance, with 1 the type `person.job.bishop` gives prefix `person:job:`, so that all the jobs share the same relations. This replaces the deprecated `eventTypeTailCut` input of the event editor, which is still used when `tailCut` is not set.
- `parentSuffix`: the last portion of type IDs representing parent entries. Default is `-`; set to an empty string to disable.
- `fallbackToAll`: what to do when no relation matches the prefix: when false (default), no relation is listed, so it must be typed; when true, all the relations are listed.

The editor marks the related entities whose relation does not start with the current prefix, e.g. because the type was changed after adding them; with `fallbackToAll`, nothing is marked when no relation matches the prefix. Relations from a taxonomy are never filtered.

These functions are exported, so that you can reuse the same logic: `resolveRelationFilter` (merges a filter over `DEFAULT_RELATION_FILTER`), `buildRelationPrefix`, and `filterRelationEntries`.

### Example

```json
"settings": {
  "it.vedph.historical-events": {
    "eventType": {
      "mode": "taxonomy",
      "source": "event-types",
      "canAddNode": true
    },
    "relationFilter": {
      "fallbackToAll": true
    }
  },
  "it.vedph.historical-events_bio": {
    "eventType": {
      "mode": "taxonomy",
      "source": "bio-events"
    },
    "relation": {
      "mode": "taxonomy",
      "source": "bio-roles"
    }
  },
  "it.vedph.historical-events_works": {
    "relationFilter": {
      "tailCut": 1
    }
  }
}
```

Here:

- all the historical events parts pick their types from the `event-types` taxonomy, and their relations from the `event-relations` thesaurus, filtered by type; when no relation fits a type, all the relations are listed.
- the parts with role `bio` pick types from the `bio-events` taxonomy, and relations from the `bio-roles` taxonomy, with no filtering. As role-specific settings replace the global ones, they do not inherit `canAddNode` nor `fallbackToAll`.
- the parts with role `works` pick types from the `event-types` thesaurus (the default, as global settings are replaced), filtering relations by the type without its last portion.
