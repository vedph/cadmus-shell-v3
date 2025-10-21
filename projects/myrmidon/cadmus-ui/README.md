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
public readonly posEntries = input<ThesaurusEntry[] | undefined>();
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

3. if you have an ID field which can be free (=when no thesaurus entries are specified for it), add a `FormControl` for it, e.g.:

```ts
this.pos = formBuilder.control('', {
  nonNullable: true,
  validators: [
    // required only if no posEntries are provided (i.e. pos is a free text string)
    NgxToolsValidators.conditionalValidator(
      () => !this.posEntries()?.length,
      Validators.required
    ),
    Validators.maxLength(100),
  ],
});
```

4. when setting the UI from data, follow this example:

```ts
// add properties:
public pos: FormControl<string>;
public tags: FormControl<ThesaurusEntry[]>;

// add in constructor:
// ...
this.pos = formBuilder.control('', {
  nonNullable: true,
  validators: [
    // required only if no posEntries are provided (i.e. pos is a free text string)
    NgxToolsValidators.conditionalValidator(
      () => !this.posEntries()?.length,
      Validators.required
    ),
    Validators.maxLength(100),
  ],
});
this.tags = formBuilder.control([], { nonNullable: true });
// ...

// when updating form controls:
private updateForm(data: WordForm | undefined | null): void {
  if (!data) {
    this.posEntry.set(undefined);
    this.formCtl.reset();
  } else {
    if (this.posEntries()?.length) {
      this.posEntry.set(this.mapIdToEntry(data.pos, this.posEntries())!);
    }
    this.pos.setValue(data.pos || '');
    this.tags.setValue(this.mapIdsToEntries(data.tags || [], this.tagEntries()));
    // ...
    this.formCtl.markAsPristine();
  }
}

 public onTagEntriesChange(entries: ThesaurusEntry[]): void {
  this.tags.setValue(entries);
  this.tags.markAsDirty();
  this.tags.updateValueAndValidity();
}

 private getData(): WordForm {
  return {
    pos: (this.posEntries()?.length ? this.posEntry()?.id : this.pos.value) || '',
    tags: this.tags.value.map((e) => e.id),
    // ...
  };
}
```

5. add the corresponding components in the HTML template. Here the first example (`pos`) refers to the above mentioned situation, where entries might be present or not, for a single thesaurus ID to pick; the second one (`tags`) to an array of IDs to pick from a thesaurus:

```html
<!-- pos -->
@if (posEntries()?.length) {
<cadmus-thes-entries-picker
  [availableEntries]="posEntries()!"
  [entries]="posEntry() ? [posEntry()!] : []"
  [hierarchicLabels]="true"
  [minEntries]="1"
  [maxEntries]="1"
/>
} @else {
<mat-form-field>
  <mat-label>POS</mat-label>
  <input matInput [formControl]="pos" />
  @if ($any(pos).errors?.required && (pos.dirty || pos.touched)) {
  <mat-error>POS required</mat-error>
  } @if ($any(pos).errors?.maxLength && (pos.dirty || pos.touched)) {
  <mat-error>POS too long</mat-error>
  }
</mat-form-field>
}

<!-- tags -->
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
```
