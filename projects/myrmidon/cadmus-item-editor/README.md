# CadmusItemEditor

- 📦 `@myrmidon/cadmus-item-editor`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.0.

This library contains the editor for a single Cadmus item with its children components.

## Item Editor

The item editor page (`ItemEditorComponent`, routed at `items/:id`) loads the item from its route (`new` for a new item), and lets users edit its metadata, parts and layers.

The item's metadata (title, sort key, description, facet, group, flags) are edited by the "dumb" `ItemMetadataEditorComponent` (`cadmus-item-metadata-editor`), which:

- edits the item received in its `item` input (ignoring its parts);
- never saves by itself: it emits `saveRequest` with the normalized metadata, `generateRequest` to generate the title (`T`) or description (`D`) (the host then calls `setGenerated`), `generateItemsRequest`, and `dirtyChange`;
- receives from its host the `facets`, `flagDefinitions`, `userLevel` (admin flags can be changed only by admins), `busy` and `hasMetadataBuilders` inputs;
- has a `readonly` input: when true, its form is disabled, flags are shown as a static list, and all the action buttons are hidden. This is used by the edit history view (`@myrmidon/cadmus-ui-history`).

When `historyEnabled` is true in `env.js`, the parts and layers lists of the item editor have a history button, opening the part editor route with a final `/history` (see `@myrmidon/cadmus-ui-history`).

