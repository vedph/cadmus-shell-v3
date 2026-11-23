# CadmusUi

- 📦 `@myrmidon/cadmus-ui`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.0.

This library contains shared UI components, services and validators for Cadmus:

- close/save buttons for part/fragment editors.
- decorated token-based text for text layers and fragment editors, with its token-based text segmenter.
- errors list.
- facets badge.
- flags badge.
- layer hints.
- lookup pin.
- part padge.
- thesaurus entries tree.
- base class for model (part/fragment) editors, with their [read-only mode](#read-only-editors).
- color service.
- user lookup.
- custom validators.
- JSON validators.

## Read-only Editors

Part and fragment editors derived from `ModelEditorComponentBase` can be made read-only:

- with their `readonly` input, e.g. `<cadmus-note-part [data]="data" [readonly]="true" />`;
- or by providing the `CADMUS_EDITOR_READONLY` injection token with true in any ancestor injector. This forces read-only mode on all the editors in that subtree, without requiring their hosts to bind any input. It is used by the edit history view (`@myrmidon/cadmus-ui-history`) to display the versions of a part in its usual wrapper and editor.

In read-only mode (`isReadonly()` is true):

- the editor's root form is disabled, so all the fields bound to it are disabled;
- `save()` (and the protected `updateValue`) do nothing, so the editor never emits data to be saved;
- `CloseSaveButtonsComponent` hides its save button when the token is provided.

Controls not bound to the root form (e.g. buttons adding or deleting entries, or child editors with their own forms) are not affected: whatever users do there cannot be saved, but editors can use `isReadonly()` to hide them.

## Decorated Token Text

- class: `DecoratedTokenTextComponent`
- selector: `cadmus-decorated-token-text`

This component displays the base text of a token-based text layer, together with the fragments of the layer, and lets users select any portion of the text with token-based coordinates. It is used both by the text layer part editor, to add, edit or delete fragments, and by fragment editors, to show the base text with the fragment being edited:

```html
<cadmus-decorated-token-text
  [baseText]="data()?.baseText || ''"
  [locations]="loc ? [loc] : []"
/>
```

It is built on the generic `SegmentedTextView` from [@myrmidon/cadmus-text-segment](https://www.npmjs.com/package/@myrmidon/cadmus-text-segment), which knows nothing about Cadmus: it just displays a text split into segments grouped into blocks, and lets users select a contiguous range of segments according to the _selection mode_ of each segment. The Cadmus coordinates system is entirely defined by `TokenTextSegmenter` (see below), which builds the segments from the text and maps selections to and from coordinates. So, should other coordinates systems be required, it would be enough to provide another segmenter.

Here, each character of the text is a segment, and each line is a block:

- whitespace characters are `wrapped`: a selection never starts or ends with them, so that whitespace at the edges of a selection is always ignored.
- combining characters are `attached` to their base character: a selection never splits them.
- the characters of each fragment in `locations` are `blocked` and highlighted: users cannot start, end or extend a selection across them. Two fragments in the same layer never overlap by design, and this way the UI makes it impossible to select a portion of text overlapping an existing fragment.

Users can:

- select any portion of the text (by dragging, SHIFT+clicking, or with SHIFT+arrow keys), getting its coordinates, i.e. the location of a new fragment there.
- click a fragment to pick it.
- optionally, when the toolbar is shown, zoom, find text, and select by typing coordinates. As typed coordinates bypass selection modes, a typed selection overlapping a fragment is flagged as such and has no location.

▶️ input:

- `baseText` (`string`): the base text.
- `locations` (`TokenLocation[]`): the locations of all the fragments to display.
- `fontSize` (`number`, default 16): the font size in pixels.
- `showToolbar` (`boolean`, default false): true to show the toolbar with zoom, find and coordinates.
- `settings` (`Partial<SegmentedTextSettings>`): optional settings overriding `DEFAULT_DECORATED_TOKEN_TEXT_SETTINGS`, which make the segmented text look like normal text.
- `colors` (`Partial<DecoratedTokenTextColors>`): optional colors for fragments, overriding `DEFAULT_DECORATED_TOKEN_TEXT_COLORS` (M3 theme tokens).

🔁 model:

- `selectedLocation` (`TokenLocation`): the location of the picked fragment. It is set when users click a fragment, and cleared when they make a new selection. The fragment equal to it (or, when none is equal, any fragment overlapping it) is highlighted as selected.

🔥 output:

- `selectionChange` (`DecoratedTokenTextSelection`): the new selection made by users, with its `location` (null when empty or overlapping a fragment), `coords`, `text`, and `overlapping` flag.

The component grows with its text; to limit its height and let the text scroll, set the `--cadmus-decorated-token-text-max-height` CSS variable (e.g. to `60vh`).

### Token Text Segmenter

`TokenTextSegmenter` implements the Cadmus token-based coordinates system. Text coordinates are token-based, a token being any sequence of non-whitespace characters, and optionally character-based within tokens. A point is `Y.X@AxR`:

- `Y`: block (line) ordinal (1-N).
- `X`: token ordinal in the block (1-N).
- optionally, if not selecting whole tokens: `A` is the ordinal of the first character in the token (1-N), and `R` the count of characters (1-N; omitted when 1, so `1.2@3` is equal to `1.2@3x1`).

A selection within a single token has a single point. A selection spanning several tokens has a start and an end point, separated by `-`, both inclusive: the start point picks from its `A` to the end of its token, the end point picks the first `R` characters of its token. Whitespace between tokens is included, while whitespace at the edges of a selection is ignored. For instance, with this text:

```txt
alpha beta
gamma
delta epsilon waw
zeta
```

- `2.1` = `gamma`.
- `1.2@2x2` = `et` (of `beta`).
- `3.1@4x2-3.2@1` = `ta e` (`ta` of `delta`, `e` of `epsilon`).
- `1.2@4-4.1@1x2` = `a gamma delta epsilon waw ze` (from the 4th character of `beta` to the first two of `zeta`).

This segmenter mirrors exactly the text model of the backend (`TextLine` and `TokenTextPart` in `Cadmus.General.Parts`) and of the legacy, DOM-based implementation (`TextLayerService` in `@myrmidon/cadmus-core`). Its unit tests check its parity with the legacy implementation for every possible selection in a set of sample texts. For this reason it differs from the generic `SpacedTextSegmenter` of `@myrmidon/cadmus-text-segment` in these corner cases:

- text is split into lines at LF only, and each line is trimmed (so a CR before LF is ignored).
- _each_ whitespace character is a token separator, so that a run of N whitespaces delimits N-1 empty tokens, which count for token ordinals: in `a  b` (with 2 spaces) `b` is `1.3`.
- `A` and `R` count UTF-16 code units, like JavaScript and C# strings (this matters only for characters outside the Basic Multilingual Plane).
- in an end point, `A` is ignored, like the backend does (when generated, it is always 1).

Coordinates are always generated in their canonical form, i.e. the one produced by `TokenLocation.toString()`.

## Thesaurus Entries Picker

- class: `ThesEntriesPickerComponent`
- selector: `cadmus-thes-entries-picker`

1. import `ThesEntriesPickerComponent` from `@myrmidon/cadmus-ui` and add it to your component's `imports`. It is assumed that your component has thesauri entries properties in (usually input) signals, like:

```ts
public readonly posEntries = input.required<ThesaurusEntry[] | undefined>();
public readonly tagEntries = input<ThesaurusEntry[] | undefined>();
```

2. add these utility function to map thesaurus ID/IDs to the corresponding thesaurus entry/entries (remove the one you do not need):

```ts
public mapIdToEntry(
  id: string | null,
  entries: ThesaurusEntry[] | undefined
): ThesaurusEntry | null {
  if (!id) return null;
  if (!entries) return { id, value: id };
  return entries.find((e) => e.id === id) || { id, value: id };
}

private mapIdsToEntries(ids: string[], entries: ThesaurusEntry[] | undefined): ThesaurusEntry[] {
  if (!entries) return ids.map((id) => ({ id, value: id }));
  return ids.map((id) => entries.find((e) => e.id === id) || { id, value: id });
}
```

3. add form controls for entries. In this example `pos` is for a single entry, `tags` is for an array of entries.

```ts
public pos: FormControl<ThesaurusEntry>;
public tags: FormControl<ThesaurusEntry[]>;

// ... in constructor:

// single entry (required)
this.pos = formBuilder.control(
  { id: '', value: '' },
  {
    nonNullable: true,
    validators: Validators.required,
  }
);
// multiple entries (optional)
this.tags = formBuilder.control([], { nonNullable: true });
```

4. when setting the UI from data, follow this example:

```ts
private updateForm(data: WordForm | undefined | null): void {
  if (!data) {
    this.formCtl.reset();
  } else {
    this.pos.setValue(this.mapIdToEntry(data.pos, this.posEntries()) || this.posEntries()?.[0]!);
    this.tags.setValue(this.mapIdsToEntries(data.tags || [], this.tagEntries()));
    // ...
    this.formCtl.markAsPristine();
  }
}

public onPosEntriesChange(entries: ThesaurusEntry[]): void {
  this.pos.setValue(entries[0]);
  this.pos.markAsDirty();
  this.pos.updateValueAndValidity();
}

public onTagEntriesChange(entries: ThesaurusEntry[]): void {
  this.tags.setValue(entries);
  this.tags.markAsDirty();
  this.tags.updateValueAndValidity();
}

private getData(): WordForm {
  return {
    pos: this.pos.value.id,
    tags: this.tags.value.map((e) => e.id),
    // ...
  };
}
```

5. add the corresponding components in the HTML template. Here the first example (`pos`) refers to the above mentioned situation, where entries might be present or not, for a single thesaurus ID to pick; the second one (`tags`) to an array of IDs to pick from a thesaurus:

```html
<!-- pos (always bound) -->
<cadmus-thes-entries-picker
  [availableEntries]="posEntries()!"
  [entries]="[this.pos.value]"
  [hierarchicLabels]="true"
  [minEntries]="1"
  [maxEntries]="1"
  (entriesChange)="onPosEntriesChange($event!)"
/>

@if (tagEntries()?.length) {
<div>
  <fieldset>
    <legend>tags</legend>
    <cadmus-thes-entries-picker
      [availableEntries]="tagEntries()!"
      [entries]="tags.value"
      (entriesChange)="onTagEntriesChange($event!)"
    />
  </fieldset>
</div>
}
```

## History

### Unreleased

- 2026-11-23: read-only mode for part and fragment editors: `ModelEditorComponentBase` has a new `readonly` input and `isReadonly` signal, and the new `CADMUS_EDITOR_READONLY` token forces read-only mode (see [Read-only Editors](#read-only-editors)).
- 2026-11-19: reimplemented `DecoratedTokenTextComponent` on top of `@myrmidon/cadmus-text-segment` (new dependency), adding `TokenTextSegmenter`. The selector and the `baseText`, `locations` and `selectedLocation` bindings are unchanged, so consumers using it just to display a fragment's base text need no change. New: `fontSize`, `showToolbar`, `settings`, `colors` inputs; `selectedLocation` is now a model; `selectionChange` output. The rendered HTML (`text` signal) was removed, and users can no longer select text across existing fragments.

### 16.0.0

- 2026-01-17: removed thesaurus related components, which were moved into `@myrmidon/cadmus-thesaurus-store`. As for names:
  - `ThesEntriesPickerComponent` => `ThesaurusEntriesPickerComponent`
  - `ThesPagedTreeBrowserComponent` => `ThesaurusBrowserComponent`
  - `StaticThesPagedTreeStoreService` => `StaticThesaurusPagedTreeStoreService`
  - `ThesaurusTreeComponent` => unchanged

This library also contains the new `EditableThesaurusBrowserComponent`, meant to replace the legacy thesaurus editor from `@myrmidon/cadmus-thesaurus-editor` and related libraries.
