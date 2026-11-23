# CadmusUiDiff

Cadmus diffing UI components. This library wraps [jsondiffpatch](https://github.com/benjamine/jsondiffpatch) to show the differences between two JSON documents, like the [jsondiffpatch demo page](https://jsondiffpatch.com).

- [CadmusUiDiff](#cadmusuidiff)
  - [Installation](#installation)
  - [JsonDiffViewComponent](#jsondiffviewcomponent)
    - [Inputs and Models](#inputs-and-models)
    - [Options](#options)
    - [Usage](#usage)
    - [Layout](#layout)
    - [Theming](#theming)
  - [Child Components](#child-components)
  - [JsonDiffService](#jsondiffservice)
  - [Security](#security)
  - [Testing](#testing)

## Installation

The library has these peer dependencies: `@angular/core`, `@angular/common`, `@angular/platform-browser`, `@angular/cdk`, `@angular/material`, and `jsondiffpatch` (`^0.7.7`).

```sh
pnpm add jsondiffpatch
```

The copy button in the JSON Patch tab uses the Material Icons font (`content_copy`, `check`).

## JsonDiffViewComponent

🔑 `JsonDiffViewComponent` (selector `cadmus-json-diff-view`) is the top-level component. You give it two JSON strings, and it shows:

- a bar with a summary of the changes (e.g. `3 changes: 1 added, 2 replaced.`) and a **show unchanged** toggle. Parse errors are shown above the bar as an alert.
- three tabs:
  1. **Visual Diff**: the jsondiffpatch HTML view, where added values are highlighted, deleted values are struck through, modified values show both their old and new value, moved array items have arrows, and long strings get a text diff. Unchanged values are hidden by default. Use the toggle to show them.
  2. **JSON (Annotated)**: the raw jsondiffpatch delta, annotated with a description of each change.
  3. **JSONPatch (RFC 6902)**: the [RFC 6902](https://datatracker.ietf.org/doc/html/rfc6902) operations that turn the left document into the right one. A button copies them to the clipboard.

The component is standalone, `OnPush`, zoneless-compatible and built on signals. It is self-contained: it needs only the two documents.

### Inputs and Models

| name            | type                          | default | description                                                                               |
| --------------- | ----------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| `left`          | `string \| null \| undefined` |         | the left (original) JSON document.                                                        |
| `right`         | `string \| null \| undefined` |         | the right (changed) JSON document.                                                        |
| `options`       | `JsonDiffOptions`             |         | diffing options (see below).                                                              |
| `hideSummary`   | `boolean`                     | `false` | hide the changes summary. Parse errors are still shown.                                   |
| `showUnchanged` | `boolean` (model)             | `false` | show unchanged values in the visual diff. Two-way bindable.                               |
| `selectedTab`   | `number` (model)              | `0`     | selected tab index (`JsonDiffViewTab`: `Visual`, `Annotated`, `Patch`). Two-way bindable. |

A `null`, `undefined` or blank document means a missing document. For instance, a document that is new on the right side is shown as entirely added. Invalid JSON is not diffed: the view shows an alert naming the invalid side and the parser's message.

### Options

`JsonDiffOptions` (all properties optional; defaults in `DEFAULT_JSON_DIFF_OPTIONS`):

- `objectHashKeys` (`['id', '_id', 'name']`): the properties used, in order of priority, to identify objects inside arrays. Matched objects are compared to each other, so a reordered item counts as a move, not as a removal plus an addition. An object with none of these properties is matched by its position. Use `[]` to match all array items by position (or by reference).
- `detectMove` (`true`): detect items moved inside arrays.
- `textDiffMinLength` (`60`): the minimum length both strings must have to get a character-level text diff instead of a whole-value replacement. `0` disables text diffs. JSON Patch never uses text diffs, because RFC 6902 does not support them.

### Usage

```ts
import { Component, signal } from '@angular/core';
import { JsonDiffViewComponent } from '@myrmidon/cadmus-ui-diff';

@Component({
  selector: 'app-part-history',
  imports: [JsonDiffViewComponent],
  template: `
    <div class="diff-host">
      <cadmus-json-diff-view
        [left]="oldJson()"
        [right]="newJson()"
        [options]="{ objectHashKeys: ['id'], textDiffMinLength: 40 }"
        [(showUnchanged)]="showUnchanged"
      />
    </div>
  `,
  styles: `
    .diff-host {
      height: 70vh;
    }
  `,
})
export class PartHistoryComponent {
  public readonly oldJson = signal<string | null>(null);
  public readonly newJson = signal<string | null>(null);
  public readonly showUnchanged = signal(false);
}
```

To compare two saved objects, serialize them first, e.g. `JSON.stringify(part)`. Key order does not matter, because objects are compared by key.

### Layout

The component fills its container (`width: 100%; height: 100%`), and the content of the active tab scrolls inside it. So its container must have a definite height: a fixed or viewport-relative height, a flex/grid item that grows (with `min-height: 0`), a dialog body, etc. The summary bar wraps on narrow screens, and long values wrap rather than scroll horizontally.

The tab content is created lazily: a tab's output is computed only when that tab is shown.

### Theming

All colors come from CSS custom properties, falling back to Angular Material M3 system tokens (`--mat-sys-*`), so the view follows your theme, light and dark. To change the defaults, set any of these properties on the component or on one of its ancestors:

| property                          | default                            |
| --------------------------------- | ---------------------------------- |
| `--cadmus-json-diff-added-bg`     | `--mat-sys-primary-container`      |
| `--cadmus-json-diff-added-fg`     | `--mat-sys-on-primary-container`   |
| `--cadmus-json-diff-deleted-bg`   | `--mat-sys-error-container`        |
| `--cadmus-json-diff-deleted-fg`   | `--mat-sys-on-error-container`     |
| `--cadmus-json-diff-moved-bg`     | `--mat-sys-secondary-container`    |
| `--cadmus-json-diff-moved-fg`     | `--mat-sys-on-secondary-container` |
| `--cadmus-json-diff-unchanged-fg` | `--mat-sys-on-surface-variant`     |
| `--cadmus-json-diff-arrow`        | `--mat-sys-secondary`              |
| `--cadmus-json-diff-hover-bg`     | `--mat-sys-surface-container-high` |
| `--cadmus-json-diff-bg`           | `transparent`                      |
| `--cadmus-json-diff-font-family`  | `"Roboto Mono"`, monospace         |
| `--cadmus-json-diff-font-size`    | `13px`                             |

For example, for the classic green/red diff colors:

```scss
cadmus-json-diff-view {
  --cadmus-json-diff-added-bg: light-dark(#c8f0c8, #1e4620);
  --cadmus-json-diff-added-fg: light-dark(#0b3d0b, #c8f0c8);
}
```

The library includes its own themed copies of the jsondiffpatch stylesheets, so you do not need to import `jsondiffpatch/formatters/styles/*.css`.

## Child Components

`JsonDiffViewComponent` combines these components, which are exported too, so you can use them in your own layouts:

- `JsonDiffVisualComponent` (`cadmus-json-diff-visual`): renders the HTML from the jsondiffpatch HTML formatter. Inputs: `html`, `showUnchanged`, and `animationDuration` (in ms; default 300) for the show/hide animation.
- `JsonDiffAnnotatedComponent` (`cadmus-json-diff-annotated`): renders the HTML from the jsondiffpatch annotated formatter. Inputs: `html`, and `emptyMessage` (shown when `html` is empty).
- `JsonPatchViewComponent` (`cadmus-json-patch-view`): shows JSON Patch operations, with a copy button. Inputs: `operations`, `emptyMessage`.

## JsonDiffService

`JsonDiffService` (provided in root, stateless) holds all the diffing logic, so you can use it without any UI:

- `parse(json)`: parse a JSON string into a `JsonParseResult` (`value`, `empty`, `error`).
- `compare(left, right, options?)`: parse and diff two JSON strings into a `JsonDiffResult` (`left`, `right`, `delta`, `hasChanges`).
- `diff(left, right, options?, textDiffs = true)`: get the jsondiffpatch `Delta` between two values. The delta is `undefined` if the values are equal.
- `toVisualHtml(delta, left?)`: get the visual diff HTML. Pass `left` to include unchanged values.
- `toAnnotatedHtml(delta, left?)`: get the annotated JSON HTML.
- `toJsonPatch(left, right, options?)`: get the RFC 6902 operations (`JsonPatchOperation[]`).
- `summarize(ops)`: count operations by type (`JsonDiffSummary`).

## Security

jsondiffpatch builds the visual and annotated HTML itself, and HTML-escapes every key and value from the compared documents. The components insert this HTML without Angular's sanitizer, because the sanitizer would strip the inline styles and SVG that the formatters need (e.g. the arrows for moved items). Markup inside the compared documents is shown as text and never interpreted.

## Testing

```sh
ng test @myrmidon/cadmus-ui-diff --watch=false
```

The service tests use plain Vitest with `TestBed`. The component tests use [Angular Testing Library](https://testing-library.com/docs/angular-testing-library/intro) and `@testing-library/user-event`, and they query by role and text.

A demo page is in the workspace app at `/demo/diff`.
