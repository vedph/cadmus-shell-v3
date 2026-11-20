# CadmusUiThestaxo

📦 `@myrmidon/cadmus-ui-thestaxo`

This library provides a single control for picking a **string value** from any of these sources:

- a **thesaurus**: a Cadmus thesaurus, either flat or hierarchical. The value is the ID of the picked entry.
- a **taxonomy**: a [TaxoStore](https://github.com/vedph/taxo-store) tree. The value is the key of the picked node.
- **unbound**: no source. The value is just typed into a textbox. This is a fallback mode for when no source is available for the value.

The purpose of this control is to let part and fragment editors pick a value without hardwiring its source in their code. An editor just drops the picker into its template, binds it to a string, and gets back a string whenever the user picks another value. The source is configured from outside, so the same editor can use a short thesaurus in one project and a rich taxonomy in another.

For instance, the type of a historical event (e.g. a birth) is usually picked from a thesaurus. But when dealing with LOD ontologies, the list of types can be much larger than what a typical thesaurus holds, and a taxonomy fits it better. With this control, the editor stays the same: only its configuration changes.

- [CadmusUiThestaxo](#cadmusuithestaxo)
  - [Requirements](#requirements)
  - [ThesOrTaxoPicker](#thesortaxopicker)
    - [Modes](#modes)
    - [Thesaurus Mode](#thesaurus-mode)
    - [Taxonomy Mode](#taxonomy-mode)
    - [Unbound Mode](#unbound-mode)
    - [Fallback](#fallback)
    - [Value and Events](#value-and-events)
    - [Settings](#settings)
  - [Usage](#usage)
    - [Two-Way Binding](#two-way-binding)
    - [Signal Forms](#signal-forms)
    - [Using Entries from an Editor](#using-entries-from-an-editor)
    - [Loading a Thesaurus by ID](#loading-a-thesaurus-by-id)
    - [Picking from a Taxonomy](#picking-from-a-taxonomy)
    - [Configurable Source](#configurable-source)
    - [Getting the Label](#getting-the-label)
    - [Displaying Labels in Lists](#displaying-labels-in-lists)
  - [ThesaurusEntryPicker](#thesaurusentrypicker)
  - [ThesOrTaxoLabelPipe](#thesortaxolabelpipe)
  - [ThesOrTaxoSourceService](#thesortaxosourceservice)
  - [Models and Helpers](#models-and-helpers)

## Requirements

Peer dependencies:

- `@angular/material`;
- `@myrmidon/cadmus-core` and `@myrmidon/cadmus-api` (for thesauri);
- `@myrmidon/cadmus-thesaurus-store` (for the thesaurus tree);
- `@myrmidon/taxo-store-api` and `@myrmidon/taxo-store-picker` (for taxonomies).

Taxonomy mode requires the TaxoStore API. Its base URL comes from the `taxoUrl` property of your app's environment (`env.js`), as for any other TaxoStore component (see the [TaxoStore shell](https://github.com/vedph/taxo-store-shell)). Thesaurus mode by ID uses the Cadmus API (`apiUrl`), via `ThesaurusService`.

## ThesOrTaxoPicker

- 🟢 `ThesOrTaxoPicker`
- 🔑 `cadmus-thes-or-taxo-picker`
- ▶️ input:
  - `mode` (`ThesOrTaxoMode`): `thesaurus`, `taxonomy`, or `unbound`. Default is `unbound`, because the other modes require more configuration.
  - `source` (`string`): the source of the value, according to `mode`:
    - `thesaurus`: the thesaurus ID (e.g. `event-types@en`). This is not required when you set `entries`.
    - `taxonomy`: the ID of the TaxoStore tree.
    - `unbound`: not used.
  - `entries` (`ThesaurusEntry[]`): the thesaurus entries, for `thesaurus` mode. When set, even to an empty array, they are used instead of loading the thesaurus from `source`.
  - `thesaurusView` (`ThesaurusViewMode`): how to display a thesaurus: `auto` (default), `flat`, or `tree`.
  - `renderLabel` (`(label: string) => string`): the function used to render the labels of thesaurus tree nodes. By default, it renders the part of the label after its last colon, if any.
  - `label` (`string`): the label of the control. Default is `value`.
  - `fallbackToUnbound` (`boolean`): true to fall back to `unbound` mode when the source is not available. Default is true.
  - `canClear` (`boolean`): true to show a button for clearing the value. Default is true.
  - `hasTopNodeFilter` (`boolean`): true to show the top-level nodes filter in the taxonomy picker. Default is true.
  - `canEditNode` (`boolean`): whether users can edit taxonomy nodes. Passed to the taxonomy picker's `canEdit`. Default is false.
  - `canAddNode` (`boolean`): whether users can add taxonomy nodes. Passed to the taxonomy picker's `canAdd`. Default is false.
  - `canDeleteNode` (`boolean`): whether users can delete taxonomy nodes. Passed to the taxonomy picker's `canDelete`. Default is false.
  - `settings` (`ThesOrTaxoSettings`): settings for the picker, typically loaded from the editor settings. Each defined property overrides the input with the same name (`mode`, `source`, `thesaurusView`, `hasTopNodeFilter`, `canEditNode`, `canAddNode`, `canDeleteNode`). So, the inputs work as defaults (see [Settings](#settings)).
  - `value` (`string`): the picked value (two-way bindable). Empty when no value is set.
  - `disabled` (`boolean`): true to disable the control.
  - `readonly` (`boolean`): true to show the value without letting users change it.
  - `invalid` (`boolean`): true when the value is invalid. This only affects styling.
  - `required` (`boolean`): true when a value is required. This only affects styling (an asterisk after the label).
  - `maxLength` (`number`): the maximum length of a typed value, in `unbound` mode.
- 🔥 output:
  - `valueChange` (`string`): emitted when the user picks, types or clears a value.
  - `pick` (`ThesOrTaxoPick`): emitted together with `valueChange`, with the value, its label, the mode it was picked in, and its source.
  - `touch`: emitted when the user has interacted with the control.

The inputs from `value` onward match the signal forms `FormValueControl` contract, so that you can bind the control to a form field with `[formField]`. The form then sets `disabled`, `readonly`, `invalid`, `required` and `maxLength` automatically.

### Modes

| mode        | source       | UI                                          | value      |
| ----------- | ------------ | ------------------------------------------- | ---------- |
| `thesaurus` | thesaurus ID | dropdown list (flat) or tree (hierarchical) | entry ID   |
| `taxonomy`  | tree ID      | TaxoStore picker (lookup + tree browser)    | node key   |
| `unbound`   | -            | textbox                                     | typed text |

You can change mode and source at any time: the control updates its UI, but it never changes or emits its value because of that.

### Thesaurus Mode

The thesaurus entries come from either of these:

1. the `entries` input. This is the typical case for Cadmus editors, which get their thesauri from their wrapper feature component, already resolved for language and aliases.
2. the thesaurus whose ID is in `source`, loaded via `ThesOrTaxoSourceService`. This is used only when `entries` is not set (i.e. it is `undefined`). The thesaurus is loaded once and shared by all the pickers which use it. Aliases are resolved, and a missing thesaurus counts as an empty one.

The thesaurus is displayed according to `thesaurusView`:

- `auto` (default): as a tree when it is **hierarchical**, i.e. when any of its entry IDs includes a dot (e.g. `person.birth`), else as a flat list.
- `flat`: always as a dropdown list.
- `tree`: always as a tree (`ThesaurusTreeComponent` from `@myrmidon/cadmus-thesaurus-store`).

In a **flat** list, users pick an entry from a dropdown. If the current value is not found among the entries (e.g. legacy data), it still shows up, as a disabled option marked "not in list". So it is never hidden or lost.

In a **tree**, users browse the tree and pick a node. As for `ThesaurusTreeComponent`, only leaf nodes can be picked. Parent entries just provide labels for their nodes. Above the tree, the control shows the label of the current value and its ID. If the value is not found among the entries, only its ID is shown.

### Taxonomy Mode

The control wraps the `TaxoStorePicker` from `@myrmidon/taxo-store-picker`, bound to the tree whose ID is in `source`. Users can look up a node by its label or aliases, or expand the tree browser to pick a node. The picked value is the node's **key**, which is unique within its tree.

Above the picker, the control shows the label of the current value and its key. As the bound value is just a key, its label is fetched from the TaxoStore API (once per key, as labels are cached). When users pick a node, its label is already known, so no request is made.

By default, users can only **pick** nodes. To also let them edit the taxonomy from within the picker, set `canEditNode`, `canAddNode` and `canDeleteNode`. These are false by default because taxonomies are usually shared across many items and editors, so editing them should be a deliberate choice. This is the opposite of the `TaxoStorePicker` defaults.

The features filter of the TaxoStore picker is not used.

### Unbound Mode

The control is a textbox. Each change to its text is emitted. If you set `maxLength`, a character counter is shown.

### Fallback

When the source required by the mode is not available, i.e.:

- in `thesaurus` mode, there are no entries: neither `entries` nor `source` is set, or the thesaurus is empty or missing;
- in `taxonomy` mode, `source` is not set;

then the control falls back to `unbound` mode, so that users can still enter a value. This replicates the common pattern of Cadmus editors, which show a textbox when their thesaurus is not available.

If you set `fallbackToUnbound` to false, the control shows a message instead (e.g. "type: no thesaurus available"), together with the current value, if any.

While a thesaurus is loading, a progress bar is shown and no fallback occurs.

### Value and Events

The control emits `valueChange` (and `pick`) **only** when the user acts on it: picking an entry or node, typing text, or clearing the value. It never emits when its inputs change. This includes the value set from outside, or a change of mode, source or entries. So, binding data to it never makes a form dirty. Picking the same value again emits nothing.

Clearing the value emits an empty string.

### Settings

The source of a value is a matter of configuration, rather than of code. So the picker can get all of its configuration from a single `ThesOrTaxoSettings` object, typically part of the [editor settings](#configurable-source):

```ts
export interface ThesOrTaxoSettings {
  mode?: ThesOrTaxoMode;
  source?: string;
  thesaurusView?: ThesaurusViewMode;
  hasTopNodeFilter?: boolean;
  canEditNode?: boolean;
  canAddNode?: boolean;
  canDeleteNode?: boolean;
}
```

Each property has the same meaning as the picker input with the same name. All of them are optional. When bound to the `settings` input, each defined property overrides the corresponding input, while undefined (or null) properties leave it untouched. So, an editor can set its defaults via inputs, and let settings override only what they specify:

```html
<!-- default to thesaurus, unless settings say otherwise -->
<cadmus-thes-or-taxo-picker
  label="type"
  mode="thesaurus"
  [entries]="typeEntries()"
  [settings]="typeSettings()"
  [formField]="form.type"
/>
```

Note that `entries` is not part of the settings. When settings specify a thesaurus mode with a thesaurus ID in `source`, that thesaurus should be loaded instead of the entries provided by the editor. Use `resolveThesOrTaxoEntries(settings, entries)` to get the entries to bind: it returns undefined in that case, and the entries otherwise.

To combine more settings objects (e.g. your editor defaults with the settings got from the app), use `mergeThesOrTaxoSettings`. It works like object spreading, except that undefined and null properties override nothing:

```ts
const DEFAULTS: ThesOrTaxoSettings = { mode: 'thesaurus', thesaurusView: 'tree' };

// { mode: 'taxonomy', source: 'events', thesaurusView: 'tree' }
mergeThesOrTaxoSettings(DEFAULTS, { mode: 'taxonomy', source: 'events', thesaurusView: undefined });
```

## Usage

Import the component:

```ts
import { ThesOrTaxoPicker } from '@myrmidon/cadmus-ui-thestaxo';

@Component({
  // ...
  imports: [ThesOrTaxoPicker],
})
export class MyEditorComponent {
  // ...
}
```

### Two-Way Binding

The simplest usage is two-way binding to a string signal:

```ts
public readonly color = signal<string>('');
```

```html
<cadmus-thes-or-taxo-picker label="color" [(value)]="color" />
```

This is in `unbound` mode, so it is just a textbox.

### Signal Forms

As the control implements `FormValueControl<string>`, you can bind it to a signal forms field just like any other control:

```ts
import { form, FormField, required } from '@angular/forms/signals';
import { ThesOrTaxoPicker } from '@myrmidon/cadmus-ui-thestaxo';

@Component({
  // ...
  imports: [FormField, ThesOrTaxoPicker],
})
export class HistoricalEventEditorComponent {
  public readonly eventTypeEntries = input<ThesaurusEntry[]>();

  private readonly _model = signal({ type: '' });
  public readonly form = form(this._model, (p) => {
    required(p.type);
  });
}
```

```html
<cadmus-thes-or-taxo-picker
  label="type"
  mode="thesaurus"
  [entries]="eventTypeEntries()"
  [formField]="form.type"
/>
@if (form.type().getError("required") && (form.type().dirty() || form.type().touched())) {
  <mat-error>type required</mat-error>
}
```

The field gets dirty and touched only when the user picks a value. Its `required`, `disabled` and `readonly` state is reflected by the control.

### Using Entries from an Editor

In Cadmus, editors get their thesauri entries from their wrapper feature. Just pass them to `entries`:

```html
<cadmus-thes-or-taxo-picker
  label="type"
  mode="thesaurus"
  [entries]="eventTypeEntries()"
  [(value)]="type"
/>
```

If the editor's thesaurus is not defined in the current project, `eventTypeEntries()` is undefined or empty, and the control falls back to a textbox. Be careful to always pass `undefined` rather than `null` when you want the control to load the thesaurus from `source`: any defined value of `entries`, including `null` and `[]`, wins over `source`.

### Loading a Thesaurus by ID

Outside of editors, or when the thesaurus is not known to the editor's feature, let the control load it:

```html
<cadmus-thes-or-taxo-picker
  label="color"
  mode="thesaurus"
  source="colors@en"
  [(value)]="color"
/>
```

Remember that thesaurus IDs include the language suffix (e.g. `@en`).

### Picking from a Taxonomy

```html
<cadmus-thes-or-taxo-picker
  label="type"
  mode="taxonomy"
  source="event-types"
  [(value)]="type"
/>
```

To let users also add nodes to the taxonomy while picking:

```html
<cadmus-thes-or-taxo-picker
  label="type"
  mode="taxonomy"
  source="event-types"
  [canAddNode]="true"
  [canEditNode]="true"
  [(value)]="type"
/>
```

### Configurable Source

The point of the control is letting the source of a value be configured per project, without changing the editor. Cadmus editors get their **settings** from the app, via `initSettings` (`ModelEditorComponentBase` in `@myrmidon/cadmus-ui`). Settings are stored in the `settings` object of the profile, under the part (or fragment) type ID. They can also be stored under the type ID plus `_` and a role ID, to apply only to the editors of the part with that role. So settings are defined once per app, but can still differ for each part role.

The recommended pattern, like that of the historical events part (`@myrmidon/cadmus-part-general-ui`), is:

1. include a `ThesOrTaxoSettings` property in the editor settings, for each picked value:

```ts
export interface HistoricalEventsPartSettings {
  eventType?: ThesOrTaxoSettings;
}

// defaults: the event-types thesaurus, as a tree
export const DEFAULT_EVENT_TYPE_SETTINGS: Readonly<ThesOrTaxoSettings> = {
  mode: 'thesaurus',
  thesaurusView: 'tree',
};
```

2. load settings in the editor (role-specific first, falling back to global ones), and merge them over the defaults:

```ts
public readonly typeSettings = signal<ThesOrTaxoSettings | undefined>(undefined);

public readonly typePickerSettings = computed(() =>
  mergeThesOrTaxoSettings(DEFAULT_EVENT_TYPE_SETTINGS, this.typeSettings()),
);

public readonly typeEntries = computed(() =>
  resolveThesOrTaxoEntries(this.typePickerSettings(), this.eventTypeEntries()),
);

constructor() {
  super();
  this.initSettings<HistoricalEventsPartSettings>(
    HISTORICAL_EVENTS_PART_TYPEID,
    (settings) => {
      if (settings || !this.identity()?.roleId) {
        this.typeSettings.set(settings?.eventType);
        return;
      }
      // no role-specific settings: fall back to global ones
      this._appRepository
        ?.getSettingFor<HistoricalEventsPartSettings>(HISTORICAL_EVENTS_PART_TYPEID)
        .then((global) => this.typeSettings.set(global?.eventType));
    },
  );
}
```

3. bind the picker to the merged settings:

```html
<cadmus-thes-or-taxo-picker
  label="type"
  [settings]="typePickerSettings()"
  [entries]="typeEntries()"
  [formField]="form.type"
/>
```

So, a project with no settings uses the editor's thesaurus, while a project dealing with an ontology just adds settings like these to its profile:

```json
"settings": {
  "it.vedph.historical-events": {
    "eventType": {
      "mode": "taxonomy",
      "source": "event-types",
      "canAddNode": true
    }
  },
  "it.vedph.historical-events_bio": {
    "eventType": {
      "mode": "taxonomy",
      "source": "bio-events"
    }
  }
}
```

Here, all the historical events parts pick their types from the `event-types` taxonomy, except for those with role `bio`, which use the `bio-events` taxonomy.

> ⚠️ Take care when the editor derives other data from the value. For instance, the historical event editor filters its relations by the prefix of the event type ID (e.g. `person.` from `person.birth`). This keeps working with a taxonomy only if its node keys follow the same dotted convention.

### Getting the Label

Some editors store both a value and its label (e.g. `{ value: 'birth', name: 'Birth' }`). Use the `pick` event, which carries both:

```html
<cadmus-thes-or-taxo-picker
  label="type"
  mode="taxonomy"
  source="event-types"
  [value]="type().value"
  (pick)="onTypePick($event)"
/>
```

```ts
public onTypePick(pick: ThesOrTaxoPick): void {
  this.type.set({ value: pick.value, name: pick.label ?? pick.value });
}
```

The `pick` event has:

- `value`: the picked value, or an empty string when cleared.
- `label`: the entry value (thesaurus), the node label (taxonomy), or the text itself (unbound). It is undefined when the value is cleared.
- `mode`: the mode the value was picked in. This is `unbound` when the control fell back to it.
- `source`: the thesaurus ID or tree ID. It is undefined for unbound values, and for thesaurus entries got via `entries`.

### Displaying Labels in Lists

Editors often list the picked values, e.g. the types of all the events in a part. To show their labels rather than their IDs or keys, whatever their source, use the [label pipe](#thesortaxolabelpipe) with the same settings and entries as the picker:

```html
@for (e of events(); track $index) {
  <div>{{ e.type | thesOrTaxoLabel: typePickerSettings() : typeEntries() | async }}</div>
}
```

## ThesaurusEntryPicker

- 🟢 `ThesaurusEntryPicker`
- 🔑 `cadmus-thesaurus-entry-picker`
- ▶️ input:
  - `entries` (`ThesaurusEntry[]`): the entries to pick from.
  - `value` (`string`): the ID of the current entry.
  - `view` (`ThesaurusViewMode`): `auto` (default), `flat`, or `tree`.
  - `label` (`string`): the label of the dropdown list. Default is `value`.
  - `renderLabel` (`(label: string) => string`): the tree node label renderer.
  - `disabled` (`boolean`): true to disable picking. In a tree, this hides the tree.
- 🔥 output:
  - `entryChange` (`ThesaurusEntry`): emitted when the user picks an entry.
  - `touch`: emitted when the user closes the dropdown list.

This is the presentational component used by `ThesOrTaxoPicker` in thesaurus mode. You can also use it on its own whenever you just need to pick an entry from a thesaurus, either flat or hierarchical, without bothering about which. It gets the entries and the current entry ID, and emits the entry picked by the user. It never emits when its inputs change.

```html
<cadmus-thesaurus-entry-picker
  label="color"
  [entries]="colorEntries()"
  [value]="color()"
  (entryChange)="color.set($event.id)"
/>
```

## ThesOrTaxoLabelPipe

- 🟢 `ThesOrTaxoLabelPipe`
- 🔑 `thesOrTaxoLabel`
- ▶️ arguments:
  - `settings` (`ThesOrTaxoSettings`): the picker settings. When undefined, or when they have no `mode`, thesaurus mode is assumed.
  - `entries` (`ThesaurusEntry[]`): the thesaurus entries provided by the editor, if any. These are ignored when settings specify a thesaurus ID in `source`.

Pipe getting the label of a value picked with the same settings, as an observable: so you must chain it with the `async` pipe. The value itself is returned whenever its label is not found, and an empty string for an empty value:

- thesaurus: the value of the entry with the value as its ID, from either the provided entries or the thesaurus loaded from `source`.
- taxonomy: the label of the node with the value as its key, in the tree specified by `source`.
- unbound: the value itself.

Data are got via `ThesOrTaxoSourceService`, so they are cached and shared with the pickers.

```html
{{ e.type | thesOrTaxoLabel: typePickerSettings() : typeEntries() | async }}
```

## ThesOrTaxoSourceService

- 🟢 `ThesOrTaxoSourceService` (root)

This service fetches the data used by the pickers from the backend, caching it so that many pickers bound to the same source (e.g. in a list) share a single request. Failed requests are logged and not cached, so they can be retried later.

The backend services (`ThesaurusService` and `TaxoStoreService`) are resolved only when first needed. So pickers which only use provided entries or free text require no backend at all (e.g. in unit tests of the editors using them).

- `getThesaurusEntries(id)`: gets the entries of the thesaurus with the specified ID. If the thesaurus is an alias (it has a `targetId` and no entries), the entries of its target are returned. A missing thesaurus, or an error, yields an empty array.
- `getTaxoNodeLabel(treeId, key)`: gets the label of a taxonomy node from its key, or null if not found.
- `setTaxoNodeLabel(treeId, key, label)`: stores a known label in the cache. The picker does this when a node is picked.
- `clearCache(what?)`: clears the cache: `thesauri`, `taxonomies`, or both when not specified. Call this when the backend data may have changed, e.g. after editing a thesaurus.

## Models and Helpers

- `ThesOrTaxoMode`: `thesaurus` | `taxonomy` | `unbound`.
- `ThesaurusViewMode`: `auto` | `flat` | `tree`.
- `ThesOrTaxoPick`: `value`, `label`, `mode`, `source` (see [Getting the Label](#getting-the-label)).
- `ThesOrTaxoSettings`: the picker settings (see [Settings](#settings)).
- `mergeThesOrTaxoSettings(...settings)`: merges settings objects, so that each defined property of a later object overrides the earlier ones.
- `resolveThesOrTaxoEntries(settings, entries)`: gets the entries to bind to a picker with the specified settings: undefined when settings specify a thesaurus ID, else the entries.
- `THESAURUS_HIERARCHY_SEPARATOR`: the separator in hierarchical entry IDs (`.`).
- `isHierarchicalThesaurus(entries)`: true if any entry ID includes a dot.
- `resolveThesaurusView(entries, view)`: resolves `auto` into `flat` or `tree`.
- `getThesaurusEntryLabel(entries, id)`: gets the value of the entry with the specified ID, if any.
