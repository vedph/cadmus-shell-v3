# CadmusUi

- 📦 `@myrmidon/cadmus-ui`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.0.

This library contains shared UI components, services and validators for Cadmus:

- close/save buttons for part/fragment editors.
- decorated token-based text for fragment editors.
- errors list.
- facets badge.
- flags badge.
- layer hints.
- lookup pin.
- part padge.
- thesaurus entries tree.
- base class for model (part/fragment) editors.
- color service.
- user lookup.
- custom validators.
- JSON validators.

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
