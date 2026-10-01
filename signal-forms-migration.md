# Signal forms migration log

Migration of the libraries under `projects/myrmidon/` from reactive forms to
`@angular/forms/signals`, following the canonical pattern in
`cadmus-bricks-shell-v3/signal-forms-component-template.md`.

**Convention for this log:** anything not marked otherwise was measured (test
run, build, mutation check, or DOM check), and the log says how. Anything
inferred but not measured is marked **believed**, together with how to check
it.

## Scope of iteration 1

All libraries except `cadmus-part-general-*` and `cadmus-part-philology-*`.
The demo app under `src/` is out of scope.

**Deferred by owner decision (2026-09-30):** `ModelEditorComponentBase`,
`CloseSaveButtonsComponent`, `CustomValidators` (all in `cadmus-ui`), and
`TaxoStoreNodesPartComponent` (`cadmus-part-taxo-ui`) stay on reactive forms.
The base class and the close/save buttons are the shared contract of every
part/fragment editor, including the ~30 in the excluded general/philology
libraries and those in downstream Cadmus apps. Converting them now would be a
breaking change. They will be migrated together with general/philology.
`TaxoStoreNodesPartComponent` is the only in-scope editor built on them.

In the same category, and also left as they are: `JsonValidators`
(`validators/json-validators.ts`) and the `extractTouchedChanges` /
`extractPristineChanges` helpers (`utils.ts`), both in `cadmus-ui`. They
are exported reactive-forms helpers (`AbstractControl`-based), and nothing
in this workspace uses them (grepped). They are API for downstream apps'
reactive editors.

## Tooling

- `scripts/build-libs.mjs` (`pnpm build:libs [lib...]`): builds the named
  libraries plus everything downstream of them, in dependency order. It first
  runs the existing `scripts/check-local-libs.js` guard, which fails if a
  local library is present in `node_modules` as anything other than a
  symlink into this workspace's `dist/`.
- The dependency graph is the union of `package.json` (peer)dependencies and
  the `@myrmidon/*` imports actually found in non-spec sources. Verified
  necessary at the time: 16 of 29 manifests omitted local libraries that
  their non-spec sources import. For example, `cadmus-ui` imported
  `@myrmidon/cadmus-state` and `@myrmidon/cadmus-api`, but its manifest
  declared only `cadmus-core`. A manifest-only order would therefore have
  been wrong.
  - An earlier version of this log said 19. That count was wrong: its
    `grep -v spec` filtered output lines that carried no file name, so
    spec-only imports were counted too.
  - The manifests have since been fixed (see below). The script keeps
    reading imports anyway, as a safety net.
- Resolution state at start (measured with `ls -la node_modules/@myrmidon`
  and the guard): all 29 local libraries resolve through `tsconfig.json`
  paths to `dist/`. `cadmus-api` is additionally linked as
  `node_modules/@myrmidon/cadmus-api -> dist/myrmidon/cadmus-api`, because the
  root `package.json` has `"@myrmidon/cadmus-api": "link:./dist/..."`. That
  link points to the same `dist/` folder, so it agrees with the paths. No
  published copy of any local library exists in `node_modules`.
- Baseline: the full `build:libs` (29 libraries) succeeded before any change.

## Libraries

### `cadmus-ui`

Tests: 145 → 151, all green. Build: `cadmus-ui` plus its 13 downstream
libraries are clean. `dist/myrmidon/cadmus-ui` was grepped: 10 `formField`
occurrences and no `formControl`/`ReactiveFormsModule`.

**Pre-existing failures (measured):** at HEAD, with a freshly built `dist/`,
3 `lookup-pin` tests were already failing (`should search using …`,
`should omit the roleId clause …`, `should set the lookup control …`). These
tests call `setInput()` and then `await fixture.whenStable()`. In this
workspace's zoneless TestBed, that path does not run change detection, so the
`initialValue` effect never re-runs. A debug spec showed 0 service calls
without `fixture.detectChanges()` and the expected call with it, for both the
original and the migrated component. The migrated spec now calls
`detectChanges()` after `setInput()`. That is a change to pre-existing tests.

- `LayerHintsComponent`:
  - The `FormArray` of checks became
    `linkedSignal(hints → { checks: false[] })` plus `form()`. It is a pure
    derivation with no model and no echo, and it reproduces the old "reset
    all checks whenever `hints` changes" behaviour. That behaviour is covered
    by the existing spec.
  - The `<form (submit)>` was removed. "apply patches" is now
    `type="button" (click)`.
  - The `form.invalid` guard in `emitRequestPatch()` and on the button was
    removed. The form had no validators, so the guard was always false.
  - Public API change: the `checks` field is gone. Use `form.checks`.
  - New specs: no `<form>` is rendered; clicking a rendered checkbox updates
    `form.checks`; the button patches only the checked hints.
- `LookupPinComponent`:
  - The field is typed `DataPinInfo | string | null`. `[formField]` on the
    native `<input matInput [matAutocomplete]>` compiles and binds through
    `MatAutocompleteTrigger`'s CVA. A spec types into the input and reads
    `'gr'` back from the field.
  - `null` is the empty value. `resetToInitial()` used to set `undefined`.
    Bricks measured that an `undefined` leaf unmaps the field.
  - `entries$`: `valueChanges` became `toObservable(form.lookup().value)`,
    built in the constructor instead of `ngOnInit`. `toObservable` also emits
    the initial `null`. The old `of([value])` would have rendered that as an
    empty option, so null/undefined values now map to `[]`. A spec covers
    this.
  - Deliberate deviation: the old code also produced an empty option when
    `resetToInitial()` found nothing. That case now produces no option.
  - The initial-value effect tracks `initialValue` and `lookupKey`
    explicitly, and runs the reset inside `untracked()`. Before the port,
    `lookupKey` was tracked only implicitly, via `lookupEntries()`.
  - Mutation checks:
    - Deleting the explicit `lookupKey()` read fails
      `should reset again when only the lookupKey changes`.
    - Removing `untracked()` does **not** fail any test. Measured: the form
      writes in `resetToInitial()` do not make the effect depend on the
      draft. `untracked()` stays only to keep the dependencies explicit.
- Deferred, still reactive: `ModelEditorComponentBase`,
  `CloseSaveButtonsComponent`, `CustomValidators` (see Scope).

### `cadmus-flags-ui`

Tests: 52, green. Build: `flags-ui` and `flags-pg` clean. `flags-pg` tests
green.

- `FlagDefinitionEditorComponent` (manual save):
  - Follows the canonical template: pure `toDraft`/`toFlag`, a
    `linkedSignal` draft with the `previous` echo check, `form()`, and a
    reset effect keyed on the draft. `getBit()` became a module-level pure
    function.
  - Text fields (including `colorKey`, a native `type="color"` input) now use
    `''` instead of `null`. The saved `FlagDefinition` is unchanged, because
    the old `getFlag()` already mapped null to `''`.
  - `<form (submit)>` was removed. Save is now `type="button" (click)`, and
    it is disabled while `invalid() || !dirty()` (was
    `invalid || pristine`).
  - Public API change: the `id`, `label`, `colorKey`, `description` and
    `isAdmin` `FormControl` fields are gone. Use `form.<name>`.
  - New specs: no `<form>`; the Save button's disabled states; save on
    click; typing reaches the field; the echo keeps `"abc "` while the model
    gets `"abc"`; a new flag rebuilds the draft and clears dirty.
  - Mutation checks:
    - Dropping the `previous` echo check fails the echo test.
    - Dropping `reset()` from the draft-keyed effect fails the new-flag
      test.
  - Behaviour difference (by design): after a save, the form keeps showing
    the untrimmed text the user typed. The old code rebuilt the form from
    the trimmed model. The parent `flag-list` binds `[flag]` and
    `(flagChange)`, so the saved model is unaffected.

### `cadmus-graph-ui`

Tests: 144, green. Build: `graph-ui` plus `graph-pg`, `graph-ui-ex`
and `graph-pg-ex` clean. Their tests are green (5, 137, 14).

**Verified along the way:** Material's `mat-error` does see signal-forms
validity through `[formField]`. A spec sets an over-long literal and marks it
touched; the `mat-error` then renders "literal too long". It is shown only
once the field is touched: the default `ErrorStateMatcher` requires
`touched`, same as under reactive forms.

- `GraphNodeEditorComponent` (manual save):
  - Canonical template. `toNode(draft, node)` keeps the edited node's `id`
    and `sourceType`.
  - `isNew` became `computed(() => !node()?.id)`. It was a writable signal
    set in `updateForm()`, and nothing outside the component writes it
    (grepped).
  - `tag`: its "(no tag)" `mat-option` value changed from `null` to `''`,
    because the same field is also bound to a native input when there are
    no tag entries. `toNode` maps `''` to `undefined`, which the old code
    did for `null`.
  - Save is `type="button" (click)`, disabled while `invalid()`. That is
    unchanged: there was no pristine check.
- `GraphTripleEditorComponent` (manual save):
  - The draft holds the three nodes plus the literal fields.
  - `toDraft` sets the nodes to `null`. An effect keyed on `triple()` then
    loads them by ID, which replaces the async part of the old
    `updateForm()`. On the echo of our own save, both the `linkedSignal`
    and the effect detect `isSameTriple(triple, draft)` and do nothing.
    Before, every save refetched all three nodes from the server.
  - `NgxToolsValidators.conditionalValidator(() => !isLiteral, required)`
    and the `isLiteral.valueChanges` subscription that swapped validators
    became declarative `required(…, { when })` / `maxLength(…, { when })`
    rules keyed on `isLiteral`. I used the built-in `when` option rather
    than `NgxToolsSignalValidators.conditional`, which would have
    required re-implementing `required` by hand. The `ngOnInit`/
    `ngOnDestroy` subscription is gone.
  - Mutation checks:
    - Dropping the echo check from the `linkedSignal` fails the echo test.
    - Dropping it from the loading effect fails the echo test (extra
      `getNode` calls).
    - Making `maxLength` on the literal unconditional fails the
      not-literal test.
  - Behaviour differences (by design):
    - Node loading no longer marks the form dirty. Nothing reads its dirty
      state; the Save button checks only `invalid()`.
    - A new triple starts from fresh values. The old `updateForm()` left a
      previous triple's object node or literal in hidden fields, but
      `getTriple()` ignored them, so the saved output is the same.
  - The old spec's `maxlength` test documented that the template checked
    the wrong error key. The signal-forms key is `maxLength`, and the new
    spec verifies the rendered message.
- `GraphNodeFilterComponent`, `GraphTripleFilterComponent` (filters, apply
  on click):
  - The draft is `linkedSignal(() => toDraft(filter()))`, where
    `filter = toSignal(repository.filter$, { requireSync: true })`. Both
    `filter$` are `BehaviorSubject`s (checked), and the existing specs
    still read the form synchronously after `filter$.next()`.
  - No echo guard. Apply is explicit, and the old code rebuilt the form
    on every `filter$` emission, including its own apply. A spec pins the
    rebuild.
  - The repository side effects of the old `updateForm()` stay in a
    `filter$` subscription with `takeUntilDestroyed()`. Specs check that
    nothing runs after destroy. Those side effects are `setLinkedNodeId`
    and `setClassNodeIds` (node filter) and `setTermId` (triple filter).
  - `reset()` now sets the default values explicitly: signal-forms
    `reset()` clears interaction state only, not values. A spec asserts
    the exact filter applied after reset.
  - Text values: `''` is the sentinel, and `getFilter()` maps a blank
    string to `undefined`. The old `null?.trim()` also gave `undefined`.
    Before, a field typed and then cleared would send `''`; it now sends
    `undefined`.
  - Enter-to-apply: the old implicit form submission is replaced by
    `(keydown.enter)="!disabled() && apply()"` on the component's own text
    inputs. The `disabled()` check matches the old behaviour: implicit
    submission does nothing when the submit button is disabled (HTML
    spec). A spec covers Enter, with and without `disabled`.
  - **Believed, not measured:** Enter inside the embedded
    `cadmus-refs-lookup` inputs, with no autocomplete option active, used
    to submit the filter too. It no longer does. To check, run the old
    build and press Enter in the lookup's text box.
  - Triple filter: static `maxlength="500"` attributes are rejected on
    `[formField]` nodes (`NG8022`, measured at build). They became schema
    rules, which `[formField]` renders as attributes. A spec reads
    `maxLength` 100 and 500 back from the DOM.
    - `sid`: `maxLength(500)`, the same typing cap as before.
    - `objectLit`: had both `maxlength="500"` and a `maxLength(100)`
      validator, and now has only 100. Before, 101–500 characters made
      `apply()` silently do nothing, with no message shown. Typing now
      stops at 100.
  - The node filter had no validators, so its `form.invalid` guard in
    `apply()` was dead and was removed, along with the spec that faked it
    with `setErrors()`.
  - `[attr.disabled]` moved from the `<form>` to the wrapper `<div>`
    unchanged.
- Public API change (all four components): the per-control `FormControl`
  fields are gone. Use `form.<name>`.

### `cadmus-graph-ui-ex`

Tests: 137 → 150, green. Build: `graph-ui-ex` and `graph-pg-ex` clean.
`graph-pg-ex` tests green (14).

`LinkedLiteralFilterComponent`, `LinkedNodeFilterComponent` and
`TripleFilterComponent` (the graph walker's filters) share one shape:

- A two-way `filter` model, and nodes loaded from the filter's IDs.
- Draft: `linkedSignal` with the echo check, `isSameFilter(filter, draft)`.
  `toDraft` leaves the nodes empty.
- An effect keyed on `filter()` resets interaction state and loads the
  nodes, except on the echo of our own apply or page change. Before, every
  apply refetched all the referenced nodes.
- No validators and no `<form>`. Apply is `type="button" (click)`, and
  Enter-to-apply works on the component's own text and number inputs,
  guarded by `disabled()`.
- `reset()` sets the default draft explicitly, then emits.
- Mutation checks: removing the echo check from the loading effect fails
  each component's echo test.

Per component:

- `LinkedNodeFilterComponent`:
  - `otherNodeId`, `predicateId` and `isObject` were public fields mirroring
    the bound filter, written only by `updateForm()`. They are now read-only
    getters over `filter()`. Existing specs read them unchanged.
  - Class nodes are held as fresh copies. A spec shows that without the
    copy in `onClassAdd`, the lookup's own object receives FieldTree's
    identity Symbol. Measured with a mutation check.
  - Array comparisons in specs go through a JSON round-trip. The Symbol
    made one pre-existing `toEqual` fail.
- `TripleFilterComponent`:
  - Static `maxlength` on `sid` (500) and `tag` (50) became schema
    `maxLength` rules (`NG8022`, as in `graph-ui`). A spec reads them back
    from the DOM.
  - Behaviour change, measured: `notPreds` is now loaded from the filter's
    `notPredicateIds`, the same way `preds` is. That costs one extra
    `getNodeSet` call when the filter has any. The old `updateForm()` never
    touched `notPreds` or `isNotPred`.
  - Reason for the change: the walker binds a new node's filter into the
    same component instance when the selection moves from node to node
    (`graph-walker.ts`, `_nOutFilter$.next(nd.outFilter)` with no `null` in
    between). The old UI therefore carried one node's excluded predicates
    over to the next node's filter, and never showed the incoming filter's
    own.
  - `isNotPred` is a pure UI toggle, not part of the filter. It is carried
    over from `previous` in the `linkedSignal`, matching the old behaviour.
    A mutation check confirms this.

### `cadmus-item-list`

Tests: 40 (4 of them new), green. Build: `item-list` plus 5 downstream libraries
clean.

- `ItemFilterComponent`:
  - Same pattern as the graph filters:
    `linkedSignal(toSignal(repository.filter$))`, with no echo guard.
  - `toSignal` is used without `requireSync`. The spec drives a plain
    `Subject`, and the store's `filter$` comes from `paged-data-browsers`,
    which I did not inspect. The initial `undefined` maps to the old
    controls' initial values.
  - The picked `user` is never synced from `filter.userId`, which is the old
    behaviour. So it is carried over from `previous` in the `linkedSignal`.
    Removing that carry-over fails the new re-sync test (mutation check).
  - `flags` stays `number[] | null`, which preserves the old output:
    `undefined` after reset, `0` after a sync with no flags. A spec pins
    both.
  - Static `maxlength="500"` on title and description became schema rules.
    So `form().invalid()` is now reachable (a title from the store over
    500 characters), and the Apply button keeps its `invalid` guard. The old
    "invalid" spec now uses a 501-character title instead of `setErrors`.
  - Enter-to-apply is on the text and date inputs.
  - `role="form"` moved to the wrapper `<div>`.

### `cadmus-item-editor`

Tests: 110, green. Build: `item-editor` plus 4 downstream libraries clean.
The downstream libraries include the out-of-scope `part-general-pg` and
`part-philology-pg`, which import it.

**Verified along the way:**

- Static `required` on a `[formField]` node is rejected (`NG8022`, measured
  at build), just like `maxlength`.
- Once the attribute is removed, the schema's `required()` still reaches
  `mat-select` through `[formField]`: the facet field renders Material's
  required asterisk (DOM spec).
- A field under `disabled()` does not count toward form validity. With an
  empty `sortKey` that is both `required` and `disabled`, the form is
  `valid()`. This matches reactive forms and keeps new items saveable.

Components:

- `ItemEditorComponent` (routed page, saves to the server):
  - Its metadata form is a real submission root. It uses
    `<form [formRoot]="metadata">` with `submission.action` calling
    `save()`, so Enter in its text inputs still saves.
  - A spec dispatches `submit` and measures `defaultPrevented === true` and
    exactly one `save` call. An invalid submit does not save and marks
    fields touched.
  - The old Save button was `type="submit"` plus `(click)="save()"`, which
    called `save()` twice per click. The second call was a no-op thanks to
    the synchronous `busy` guard. The `(click)` is gone.
  - Draft: `linkedSignal` from `item`, with the canonical echo check on the
    edited metadata subset. A mutation check confirms the check matters.
    When the server returns a different item, the draft is rebuilt (e.g. a
    new `sortKey` computed server-side); a spec covers this.
  - `sortKey` uses `disabled()` instead of `.disable()`.
  - `_flagsValue` is `computed()` over the flags field. It was
    `toSignal(valueChanges)`.
  - `canDeactivate()` reads `metadata().dirty()`. `save()` calls
    `metadata().reset()` on success, replacing `markAsPristine()`.
  - The new-part mini form became a plain `<div>`. It has no text input
    and no submit, so nothing is lost.
  - Fixed by the migration: the template's error checks used
    `hasError("maxLength")`, but reactive forms' key is `maxlength`, so
    the "too long" messages could never show. The signal-forms key is
    `maxLength`, so they now work, and `[formField]` also caps typing at
    that length.
  - Public API change: the `title`, `sortKey`, `description`, `facetCtrl`,
    `group`, `flags` and `newPartType` fields are gone. Use
    `metadata.<name>` (`facetCtrl` becomes `metadata.facet`) and
    `newPart.newPartType`.
- `ItemGenerateDialogComponent` (dialog):
  - A real submission root: `<form [formRoot]>` with a `submission.action`,
    and the generate button stays `type="submit"`. Specs cover a valid
    submit (closes with the result and prevents default), an invalid
    submit, and `min`/`max` rendered from the schema. The static `min="1"`
    was removed (`NG8022`).
  - `itemFlags` now holds flag IDs, not `FlagDefinition` objects. The old
    array held the caller's own objects, which FieldTree would tag with its
    identity Symbol. A spec checks that the caller's objects stay
    untagged.
- `PartsScopeEditorComponent`:
  - `CustomValidators.minChecked(1)` (deferred, still reactive) became an
    inline `validate()` with error kind `minChecked`.
  - The checks are rebuilt when `parts` change. The scope survives,
    carried from `previous`, matching the old `updateForm()`. A mutation
    check confirms this.
  - An empty scope is emitted as `null`, as the untouched old control
    did, because the request is POSTed as JSON. A spec pins it.
  - `(change)="onCheckChanged()"` (an `updateValueAndValidity` call) was
    dropped.
  - Assign is `type="button" (click)`, with Enter on the scope input
    guarded by `readonly()`.

### `cadmus-item-search`

Tests: 39, green. Build clean (no downstream libraries).

- `ItemQueryComponent` (widget emitting `querySubmit`):
  - Not a submission root. Search is `type="button" (click)`, and the
    textarea keeps its explicit `(keydown.enter)`. A spec measures that the
    handler submits and prevents the newline.
  - The draft is a `linkedSignal` from the `query` input. `history` and
    `partDef` carry over from `previous`, because the old `updateForm()`
    touched only the query. A spec covers this.
  - `partDef.valueChanges` became `toObservable(form.partDef().value)` with
    `filter(id => !!id)`. `toObservable` also emits the initial `null`,
    which would call `getDataPinDefinitions(null)`. A mutation check
    confirms the filter matters.
  - The pre-existing pin-definitions spec needed `fixture.detectChanges()`
    after setting the value, because `toObservable` emits from an effect.
  - The old `updateForm()` also called `markAsDirty()`. Not ported: dirty
    alone does not show `mat-error` (Material's matcher needs touched, as
    measured in the `graph-ui` spec), and nothing else reads it.
  - The clear button called `queryCtl.reset()`, which under reactive
    forms set the value to `null`. It now calls `clearQuery()`, which sets
    `''` and clears interaction state.

### `cadmus-layer-demo`

Tests: 20, green. Build clean.

- `LayerDemoComponent` (a lazy-loaded route page, per `src/app/app.routes.ts`):
  - A real submission root: `<form [formRoot]="rendition">` with a
    `submission.action` calling `render()`. The render button stays
    `type="submit"`, and Enter in the location input still renders.
  - Under reactive forms, the static `required` (location) and
    `maxlength="1000"` (text) attributes installed validators through the
    `RequiredValidator`/`MaxLengthValidator` directives. But `ngSubmit`
    fired regardless of validity, so render ran even with an empty
    location.
  - Those attributes are rejected on `[formField]` nodes (`NG8022`), so
    they became `required()`/`maxLength()` rules. The spec reads
    `required` and `maxLength` back from the DOM.
  - To keep render working with an invalid form, the submission uses
    `ignoreValidators: 'all'`. Removing it fails the "renders even when
    the location is empty" spec (mutation check).

### `cadmus-preview-ui`

Tests: 81, green. Build: `preview-ui` and `preview-pg` clean. `preview-pg`
tests green (9).

- `TextSegmentsViewComponent`: a false positive. It imported
  `FormsModule`/`ReactiveFormsModule` but bound no form directive; the
  imports were removed.
- `TextPreviewComponent`: the layer picker is a one-field `form()`.
  - Its load trigger was redesigned. The old code ran
    `effect(() => selectedLayerValue())`, where `selectedLayerValue` was
    `toSignal(valueChanges)`, and relied on `toSignal` starting as
    `undefined` to skip loading at construction (`layer !== undefined`).
  - A signal-forms field cannot start as `undefined`. A `null` start would
    make the effect call `loadLayer()` at construction, and whether that
    races `loadItem()` would depend on effect ordering.
  - The load now runs exactly where the old effect ended up running:
    `loadItem()` calls `loadLayer()` right after selecting the layer, and
    the `mat-select`'s `(selectionChange)` calls `onLayerChange()` for user
    picks. That removes the effect, `selectedLayerValue` and the
    `undefined` trick.
  - A `MatSelectHarness` spec measures a real user pick: the field gets
    `layerB` and segments are fetched once for `['layerB']`. Removing the
    `(selectionChange)` binding fails it (mutation check).
  - Public API change: `selectedLayer` (`FormControl`) and
    `selectedLayerValue` are gone. Use `form.selectedLayer`.

### `cadmus-profile-editor`

Tests: 96, green. Build clean (no downstream libraries).

**Verified along the way (important for later iterations):**

- The signal-forms `required()` rule does **not** flag an empty array. A
  spec set `partDefinitions` to `[]` and got
  `getError('required') === undefined`. Reactive `Validators.required` did
  flag `[]`. Wherever a reactive `required` guarded an array, port it as
  `validate(path.x, ({ value }) => value().length ? null : { kind: 'required' })`.
- The signal-forms `pattern()` rule accepts `''`, as reactive
  `Validators.pattern` did. A spec checks that an empty `colorKey` is valid
  and a malformed one gets a `pattern` error.
- FieldTree's identity Symbol also ends up on objects the component
  *emits*, if the model is built from the draft's own array items. A spec
  shows the emitted part definitions tagged when `toData` does not copy
  them (mutation check).
  - Copies go through `Object.entries`, which takes string keys only.
    **Believed, not measured:** object spread would also copy the tag,
    since it copies enumerable own Symbols and vitest prints the tag the
    way it prints enumerable properties.

Components:

- `PartDefinitionEditorComponent` (manual save, embedded in the facet
  editor):
  - Canonical template: `linkedSignal` with the echo check, a reset effect
    keyed on the draft, and save as `type="button" (click)`, disabled while
    `invalid() || !dirty()`.
  - `isBaseTextPart` is a plain `computed()` over `form.typeId().value()`.
    It used to be `toSignal(typeId.valueChanges)`.
  - Specs: echo (`"abc "` kept, model gets `"abc"`), rebuild on a new
    definition, no `<form>`, and save enabled after typing.
- `FacetDefinitionEditorComponent` (manual save; embeds the part
  definition editor):
  - Same template.
  - `partDefinitions` is copied on the way in (sorted by `sortKey`, as
    before) and on the way out. The old `updateForm()` spread the array
    but kept the caller's item objects.
  - `updatePartDefinitionSortKeys()` + `markAsDirty()` in four places
    became one `setPartDefinitions()`.
  - The "at least one part" rule uses `validate()`; see above.
- Nesting: both editors used to render a `<form>`, so the part definition
  form was nested inside the facet form. Both now render none, and both
  specs assert it.

### `cadmus-profile-import`

Tests: 31, green. Build clean.

- `SettingsImportComponent`, `FacetImportComponent`:
  - Each is a small `form()` with the fields `file` (`File | null`,
    unbound: set from the file input's `(change)`), `dryRun`, and `mode`
    (facet import only).
  - The `AbstractControl`-based `FileExtensionValidator` class became a
    `validate()` rule with the same `invalidExtension` error kind.
  - Not submission roots, and nothing is lost by dropping the `<form>`:
    with no text inputs, Enter never submitted.
  - Upload is `type="button" (click)`.
  - A DOM spec walks the whole flow:
    - "file required" is shown and upload is disabled;
    - a `.txt` file shows "invalid file type" and keeps upload disabled;
    - a `.json` file enables upload, and a click uploads.

### `cadmus-statistics`

Tests: 20, green, with no unhandled errors. Build clean.

- `EditFrameStatsComponent`:
  - Three `effect()`s each set their own control when their `initial*`
    input became truthy, and never cleared it.
  - Porting them to one `linkedSignal` over all three inputs would
    recompute every field whenever any input changed, stomping a date the
    user had picked. So the computation compares each input with
    `previous.source` and applies only the ones that changed. Two specs
    pin this: "does not stomp a user-edited date when another input
    changes" (removing the `previous.source` comparison fails it, as a
    mutation check), and "does not clear a date when its input becomes
    null".
  - `createdSignal`/`updatedSignal`/`deletedSignal` were writable signals
    kept in sync by `valueChanges` subscriptions. They are now `computed()`
    over the checkbox fields. A DOM spec clicks a checkbox and reads the
    signal.
  - Auto-refresh: `combineLatest` of three `valueChanges` became
    `toObservable(computed([start, end, interval]))`, with the same
    value-level `distinctUntilChanged`.
    - No `skip(1)`: the first emission carries the `initial*` values,
      which the old input effects also pushed through `combineLatest`. A
      spec checks exactly one auto-load from the inputs.
    - An early emission with missing dates is a no-op, because
      `loadData()` returns early.
  - Static `readonly` on the datepicker inputs compiles on a `[formField]`
    node, unlike `required`, `maxlength` and `min`, so it stays. That is
    measured by the build. **Believed, not measured:** picking a date
    with the datepicker still works with `readonly`. To check, run the
    app and pick a date.
  - Spec changes:
    - The two auto-refresh specs used fake timers. `toObservable` emits
      from an effect, which the zoneless scheduler runs on a timer. With
      fake timers the debounce started late, and adding `TestBed.tick()`
      produced `NG0101` (recursive tick). They now use real timers:
      `detectChanges()` plus a 350 ms wait.
    - As a result, loads really complete, and `ngx-echarts` initializes
      its chart. The `NGX_ECHARTS_CONFIG` stub had no `init`, so the stub
      now returns a no-op chart.

### `cadmus-thesaurus-ui`

Tests: 97 → 109, green. Build: `thesaurus-ui` and `thesaurus-editor` clean.
`thesaurus-editor` tests green (17).

**Pre-existing failure (measured):** at HEAD, 1 test was already failing:
`thesaurus-lookup` › `should set the lookup control to the first found
entry`. The cause is the same `setInput()` + `whenStable()` harness issue as
in `cadmus-ui`. The migrated spec adds `detectChanges()`.

- `ThesaurusEditorComponent` (manual save; hosts the next two components):
  - Before the migration, its template had a filter `<form>` literally
    nested inside the main `<form>`, and each `thesaurus-node` added its
    own `<form>` inside that. Following the measured facts in the brief
    (nested forms exist in the DOM; `submit` never reaches an ancestor
    form), the effective behaviour was:
    - Enter in the filter text box applied the filter;
    - Enter in the thesaurus ID saved (when valid);
    - Enter in a node's inputs saved that node only.
    Each of these is now an explicit `(keydown.enter)`. No component
    renders a `<form>`; specs cover no `<form>` and Enter/click on the
    filter.
  - Form values: `linkedSignal(() => toDraft(thesaurus()))`, with no echo
    guard. The old form was rebuilt on every `thesaurus` change including
    its own save, and `getThesaurus()` does not normalize, so there is
    nothing to stomp.
  - The side effects of the old `updateForm()` (`importEntries()` into the
    nodes service and a list reset, on every change including the echo)
    moved to an effect keyed on `thesaurus()`. A spec pins the re-import
    on echo.
  - The `alias.valueChanges` subscription that swapped validators became
    declarative `when` rules keyed on `alias`. A spec covers both modes.
  - The filter is a separate `filterForm`.
- `ThesaurusNodeComponent` (inline row editor, manual save):
  - Canonical template with the echo check.
  - `indent` is a `computed()`. An effect keyed on `node()` ends editing,
    as the old `updateForm()` did.
  - Enter in its inputs saves via `(keydown.enter)`, only when
    `form().dirty()`. Implicit submission used to be blocked while the
    Save button was disabled, i.e. while pristine. Escape still cancels,
    now handled on the wrapper `<div>`. Specs cover both.
  - Deliberate difference: dirty state is now cleared when a new node is
    bound, following the template's reset effect. The old code kept it.
- `ThesaurusLookupComponent`: the same port as `cadmus-ui`'s
  `LookupPinComponent`, with one measured nuance.
  - In the old code, `lookupEntries()` short-circuited on an empty filter
    *before* reading `lookupFn()`, so the initial-value effect depended on
    `lookupFn` only when `initialValue` was non-empty.
  - An unconditional `lookupFn()` read made a `lookupFn` change with no
    initial value reset the field to `null`, stomping a typed value. The
    pre-existing `ids$` spec caught this. The dependency is now
    conditional, as before; specs pin both cases.
  - (In `LookupPinComponent`, `lookupKey()` is read before the
    short-circuit, so its unconditional read matches the old behaviour.)

### `cadmus-thesaurus-list`

Tests: 56, green. Build clean.

- `ThesaurusFilterComponent`:
  - Uses the filter pattern: `linkedSignal(toSignal(filter$))`, with
    `reset()` setting defaults explicitly and Enter-to-apply on its text
    inputs.
  - The old code subscribed with `this.filter$?.pipe(...)`, tolerating a
    missing `filter$`. The `ThesaurusListComponent` spec relies on that:
    its repository mock has none, and all 24 of its tests crashed until
    `toSignal(filter$ ?? of(undefined))` restored the tolerance.
  - Static `maxlength` (100, 2) became schema rules; a spec reads 100 back
    from the DOM.
- `ThesaurusImportComponent`:
  - Same port as `cadmus-profile-import`, plus `mode` and three Excel
    number inputs.
  - Their static `min="1"` became `min()` rules (`NG8022`). A spec reads
    `min="1"` back.
  - Enter in those number inputs used to submit through implicit
    submission, so they now have `(keydown.enter)` guarded by
    `uploading()`, which mirrors the disabled button. A spec covers this.
  - `onFileSelected` set `files[0]`, which is `undefined` when the dialog
    is cancelled. It now maps that to `null`, because an `undefined` leaf
    unmaps the field.
- `ThesaurusListComponent` (routed list page):
  - The "add thesaurus" adder is a real submission root (it creates a
    thesaurus on the server): `<form [formRoot]>` with `submission.action`
    calling `addThesaurus()`, and its button stays `type="submit"`. A spec
    measures `defaultPrevented` and the server check on submit.
  - The cross-field rule "target ID must differ from ID" was a *group*
    validator. It is now a `validate()` on the target ID field, so that
    field becomes invalid. Form validity is the same either way.
  - As a result, the field's `mat-error` "Target ID must differ from ID"
    now renders; a DOM spec measures this. **Believed, not measured:**
    under reactive forms this message could never show, because a group
    error does not put the target-ID input into an error state. To check,
    run the old build, enter the same ID twice, and blur.

## Final verification (2026-09-30)

- **Full build:** `node scripts/build-libs.mjs` built all 29 libraries in
  order, with exit code 0.
- **All tests:** `ng test` ran on every library, including the
  out-of-scope `part-general-*`/`part-philology-*`, which run against the
  rebuilt `dist/`. 28 libraries: 2,807 tests, all green.
  `cadmus-part-taxo-pg` has no spec files, which predates the migration.
- **Browser:** `.angular/cache` was deleted, then `ng serve --port 4300`
  was run with headless Chrome driven over CDP.
  - There was no backend. The Cadmus API (`localhost:5050`) was mocked
    *inside the browser* only, via the CDP `Fetch` domain, including CORS
    preflights. The route guards were given a client-side admin session in
    `sessionStorage` (`auth-jwt.user`/`auth-jwt.token`). No server,
    database or container was touched.
  - What the browser ran was checked by fetching every loaded script:
    - the served chunks contain the migrated code (`rendition.location`
      for the layer demo, `form.partDefinitions` for the profile editor,
      `this.form.interval` for the statistics component);
    - the old `created.valueChanges` is gone;
    - `formControlName` remains only in out-of-scope chunks (philology,
      general, the demo app's `main.js`, and the npm `auth-jwt-*`
      components).
  - A) `/demo/layers` (a `[formRoot]` submission root): a real Enter
    keypress in the location input rendered the text, and the render
    button rendered even with an empty (invalid) location. In both cases a
    `window` marker survived, so there was no reload or navigation.
  - B) `/profile/facets`, the nested-widget flow (facet list, then facet
    editor, then the nested part-definition editor):
    - with the nested editor open, the DOM had 0 `<form>` elements;
    - a real Enter in the nested input neither reloaded the page nor
      closed either editor;
    - the nested Accept (`type="button"`) closed the part editor and
      updated the facet's part list, with `"Note renamed "` saved as
      `"Note renamed"`;
    - the facet Accept closed the facet editor with no navigation;
    - there were no console errors.
  - Harness mistakes made and fixed along the way (none were app
    defects):
    - the session was first seeded into `localStorage` instead of
      `sessionStorage`;
    - the mock did not answer CORS preflights;
    - the rendition `<code>` was blanked by hand, which breaks Angular's
      binding;
    - a key event sent the literal characters `\r` instead of a carriage
      return.

## Reported bugs: fixed (2026-09-30, second pass)

Every bug reported in the first pass is now fixed.

How each fix was verified:

- It has a spec, and each new spec was shown to **fail without the fix**.
  That was done either by running it on the old code or with a mutation
  check (the fix removed or neutralized).
- Where the log had said **believed**, the behaviour was measured before
  fixing. All four believed claims turned out true.
- The local Cadmus API (with mock data) was used where the server's side
  mattered. Only read queries were made, logged in as the seeded admin.

`cadmus-ui`:

- `LayerHintsComponent`: "Edit this fragment" now emits `requestEdit` with
  its hint. The consumers in `part-general-pg` already handled
  `(requestEdit)`.
- Removed the leftover `console.log`s in `LookupPinComponent` (keeping its
  `initialValue()` dependency) and in
  `ModelEditorComponentBase.onIdentitySet`.

`cadmus-api` (found while fixing the walker filters: the same bugs one
layer down):

- `GraphService` dropped `0` for `minLiteralNumber`/`maxLiteralNumber`
  (`if (filter.x)`) and for `sourceType` in `getLinkedNodes`. They are now
  null/undefined checks.
- New `HttpTestingController` specs check the query parameters. Both fail
  on the old service.

`cadmus-graph-ui`:

- `GraphTripleEditorComponent`: a node response is applied only if the
  currently bound triple still refers to that node ID. A spec delivers a
  late response for a replaced triple; mutation-checked.
- `GraphNodeFilterComponent.reset()` also clears the repository's linked
  node and class nodes.
- `GraphTripleFilterComponent`: added the missing tag input, with
  `maxLength(50)` and Enter-to-apply. `[attr.disabled]` no longer renders
  `disabled="false"`.

`cadmus-graph-ui-ex` (walker filters):

- `LinkedNodeFilterComponent`: the `isClass` options are now `null`
  "(any)", `true` "class" and `false` "not-class". `isClass` and
  `sourceType` are mapped with `??`, so `false` and "user" (`0`) survive.
  - Measured on the API: over 15 nodes, `isClass=false` returns 9 and
    `isClass=true` returns 6, so "not-class" is now a real filter.
  - All the mock nodes have `sourceType` 0 ("user"), the value the old
    mapping dropped.
- `LinkedNodeFilterComponent`, `TripleFilterComponent`: the paginator gets
  `total()`, not the signal function.
- `LinkedLiteralFilterComponent`, `TripleFilterComponent`: the lookups
  bind `[item]` to the loaded subject/predicate/object, so a node loaded
  from the filter is displayed.
- Min/max literal numbers (and `hasLiteralObject` in the triple filter,
  the same bug) are mapped with `??`, so `0`/`false` survive.
- All three filters ignore node responses for a filter no longer bound
  (ID comparison).
- The 12 new specs all fail with the fixes reverted (the inverse of the
  fix script).

`cadmus-item-list`:

- `ItemFilterComponent`: the `flagMatching` options bind numeric values.
- A `MatSelectHarness` spec measured the old bug: the select showed `''`
  instead of "(flags ignored)". It now shows the label, and a picked
  option is sent as a number.
- (`ItemService` coerced with `+`, so the server had been receiving
  correct values.)

`cadmus-item-editor`:

- `ItemEditorComponent`: the metadata `linkedSignal` also keeps the draft
  when the *same* item (same ID) is reloaded with unchanged metadata.
  That is the `previous.source` comparison: for example, the reload after
  setting the parts' thesaurus scope no longer discards unsaved edits.
- Another item, or changed metadata, still rebuilds the draft. Three
  specs cover this; mutation-checked.

`cadmus-layer-demo`:

- Measured first: a "remove location" button was `type="submit"`, and
  each removal called `render()`. It is now `type="button"`.

`cadmus-preview-ui`:

- `TextPreviewComponent`: removed the 19 debug `console.log`s. The source
  effect's `else` branch, which held only a log, went with them.
- Measured first: with "all" selected, the select showed `''`. It now
  has `[compareWith]="compareLayers"` (by ID) and shows "all".

`cadmus-thesaurus-ui`:

- `ThesaurusEditorComponent`: measured first, in both directions. A new
  thesaurus never became valid after adding nodes, and a thesaurus
  stayed "valid" after its last node was deleted.
  - The stale `entryCount` field is gone. The "at least one entry" rule
    (a root `validate()` with kind `noEntries`) reads a live node count,
    taken from `ThesaurusNodesService.selectNodes()`.
  - The service publishes on import, add and delete (checked in its
    source).
- `ThesaurusNodeComponent`: measured first: "Discard changes" kept the
  discarded text. Discard now restores the draft from the bound node and
  clears the interaction state.
- `ThesaurusLookupComponent`: `resetOnPick` now works (clears after
  emitting, as in `LookupPinComponent`). No consumer in the workspace sets
  it. The leftover `console.log` was removed.

`cadmus-thesaurus-list`:

- `ThesaurusFilterComponent`: "(any)" is sent as `undefined` and "not an
  alias" as `false`.
  - Measured on the API: no filter returns 28 thesauri, `isAlias=false`
    25 and `isAlias=true` 3. So "(any)" used to hide the 3 aliases.
  - The empty/reset filter is now "(any)". That matches the repository's
    initial filter (no `isAlias`), which the form used to display as "not
    an alias".

Package manifests:

- The 16 libraries whose non-spec sources import local libraries they
  did not declare now declare them as `peerDependencies`, as
  `^<current version>`.
- The remaining 3 import `cadmus-api`/`cadmus-state` only in specs.

Verification of the second pass:

- `node scripts/build-libs.mjs` built all 29 libraries, with exit code 0.
  The manifests changed, so this also checks the new peer dependencies.
- `ng test` on every library: 28 libraries, 2,833 tests, all green.
  `cadmus-part-taxo-pg` still has no specs.
- Real-API browser check, read-only:
  - `ng serve` on port 4200, driven by headless Chrome over CDP, after a
    real login as the seeded admin.
  - The server's CORS policy allows only `http://localhost:4200`. A
    preflight from `localhost:4300` gets no `Access-Control-Allow-Origin`
    (measured), so an earlier attempt on 4300 failed with "Failed to
    fetch".
  - `/thesauri` results:

    | Filter | Rows | Request sent |
    | --- | --- | --- |
    | default "(any)" | 28 | no `isAlias` |
    | "not an alias" | 25 | `isAlias=false` |
    | back to "(any)" | 28 | `isAlias` omitted |

  - No exceptions.

## Item filter user lookup (2026-10-01)

Reported: on `/items`, picking a user in the filter's user lookup did not
display the user. The report suspected the lookup component.

Reproduced in the real app (`ng serve` on 4200, headless Chrome, real login
and API):

- After picking "zeus", the lookup collapsed to a button showing its label,
  "user", instead of "zeus".
- The filter's user value *was* `"zeus"`, and Apply *did* send
  `items?…&userId=zeus`. So the criterion was applied, but invisible.

The cause is in `ItemFilterComponent`, not in the lookup:

1. The lookup emits the picked item in `UserRefLookupService`'s shape,
   `{ user, roles }`.
2. `onUserChange` stored only the inner `user` object in `currentUser`.
3. That signal is bound back as `[item]`. Since `item` is a two-way
   `model` in the lookup, this replaced the picked item with the inner
   object (measured: the lookup's `item()` became the inner user).
4. `getName(item)` reads `item.user.userName`, which is undefined for that
   object, so the button fell back to the label.

**Believed, not measured:** the same code is at HEAD, before this
migration, so the symptom most likely appeared with the upgraded
`@myrmidon/cadmus-refs-lookup` 11.x, whose `item` is a `model`. To check,
run HEAD against the previous lookup version.

Fix:

- `currentUser` is now a `UserWithRoles`: it keeps the picked item as
  emitted, and the user name is read from `picked.user.userName`.
- A spec drives the real `RefLookupComponent.pickItem()`. It checks that
  the lookup keeps the picked item, that its button shows "zeus", and that
  apply sends `userId: 'zeus'`.
- With the old assignment restored, the spec fails at the item check, the
  failure seen in the browser.
- Re-run in the app after rebuilding and clearing `.angular/cache`: the
  served `dist` chunk contains the fix. After the pick the lookup shows
  "zeus", and Apply sends `userId=zeus`.

`NG0956` from the lookup's options (fixed in the bricks workspace):

- Confirmed in `cadmus-bricks-shell-v3`, in
  `cadmus-refs-lookup/src/lib/ref-lookup/ref-lookup.component.html`:
  `@for (i of items$ | async; track i)`. Each lookup response carries
  fresh objects, so tracking by identity re-created every `mat-option` on
  every response.
- A new spec uses a service that returns fresh copies, like HTTP does.
  Before the fix, the `mat-option` element differed between two responses
  for the same item, and `NG0956` was logged. After it, the element is
  reused and nothing is logged.
- The fix is `track $index`, since items have no common identity field. A
  second spec checks that a reused option, now showing a different item,
  picks that item.
- The library builds. Its README history has an "unreleased" entry; I did
  not bump the version.
- This shell uses the published `@myrmidon/cadmus-refs-lookup` 11.0.6 from
  npm, so the fix reaches it only once a new version is published and
  installed here.
- Not touched: 5 `ref-lookup` tests in bricks were already failing at its
  HEAD (measured). Four are `items$`/loading tests that set the field
  value without `detectChanges()`, which looks like the same
  `toObservable` harness issue seen here. The fifth is an accessibility
  test on the clear button.

## Iteration 2 (2026-10-01): the editors base and the part libraries

Scope, by owner request: the libraries left out of iteration 1, i.e.
the editors base in `cadmus-ui` (`ModelEditorComponentBase`,
`CloseSaveButtonsComponent`, the validators), `cadmus-part-taxo-ui`,
`cadmus-part-general-*` and `cadmus-part-philology-*`. One commit per
library, not pushed.

Before starting, the 5 failing `RefLookupComponent` tests in the bricks
workspace were fixed and committed there (`58744fe`, together with the
`NG0956` fix). They were harness issues, and the component was not
changed for them:

- four `items$` tests set the lookup value without running change
  detection, which `toObservable` needs before it emits. They now call
  `fixture.detectChanges()` after setting it;
- the clear button test read `aria-describedby` right after
  `detectChanges()`. `MatTooltip` sets it in an `afterNextRender` hook
  (read in `@angular/material` 22.2.0's tooltip source), so the test now
  awaits `fixture.whenStable()` first;
- result: 106 of 106 tests pass in that library.

### Design of the editors base (`cadmus-ui`)

- **No `<form>` in part editors.** Part editors embed child editors and
  bricks widgets (which already render no `<form>`). Inside a
  `<form>` with a submit button, a browser submits the form when Enter is
  pressed in any of its text inputs (implicit submission). So, as long as
  part editors used `<form (submit)="save()">`, Enter in a child widget's
  input would save the whole part. **Believed, not measured** for the
  pre-migration code: to check, run the previous commit, open a part
  editor that embeds a bricks widget with a text input (e.g. a historical
  date), and press Enter in it.
  - So the save button of `CloseSaveButtonsComponent` is now
    `type="button"` and emits `saveRequest`. Editors bind
    `(saveRequest)="save()"`.
  - Behaviour change: Enter in a part editor's own input no longer saves
    the part. Saving takes the save button.
- `form` is an abstract `FieldTree<unknown>`. A derived editor creates
  it with `createForm(draft, schema?)` from its own draft, which wraps
  `form()` and adds `disabled(root, () => this.disabled())`.
  - `FieldTree<any>` does not work as the base type. With `any`, the
    `FieldTree` conditional type resolves to its reactive-forms
    compatibility branch, and `FieldTree<{ title: string }>` is then not
    assignable to it (TS2416, measured). `FieldTree<unknown>` is
    assignable.
  - Disabling the root disables every field. This was read in the forms
    source (`disabledReasons` is parent's plus own) and measured: a spec
    checks the root, a child field and the rendered `<input>`. A mutation
    check (the rule's condition made always false) fails it.
- The draft lives in the derived class, normally as
  `linkedSignal(() => toDraft(this.data()?.value))`. That rebuilds the
  draft from every new `data`, including the echo of a save, as the old
  `onDataSet` → `updateForm` did. These are manual-save editors, so the
  autosave echo problem of the canonical template does not arise.
- One base `effect` on `data` resets the form's interaction state and
  then calls `onDataSet(data)`. That replaces the `markAsPristine()` at
  the end of every old `updateForm()`. Mutation-checked: without the
  reset, the "clear the dirty state when new data is bound" spec fails.
- `isDirty` is `computed(() => this.form().dirty())`, and `dirtyChange`
  is emitted from an effect only when the value changes. The old one was
  emitted on `PristineChangeEvent`. Specs check one emission for two
  keystrokes, none for binding data to a pristine form, and
  `[true, false]` when new data arrives after an edit.
- `save()`: an invalid form is not saved (as before), and is now marked
  as touched. `markAsPristine()` became `form().reset()`, which resets
  only the interaction state.
- The constructor takes no parameters. `authService` is `inject()`ed
  and still `protected`. `FormBuilder` is gone.
- `CustomSignalValidators.minChecked` and `JsonSignalValidators.json`
  were added next to the reactive ones, which are kept but marked
  `@deprecated`. Nothing in this workspace uses the reactive ones
  (grepped), and downstream apps may.
- `extractTouchedChanges`/`extractPristineChanges` (`utils.ts`) were left
  as they are: they are generic `AbstractControl` helpers, and nothing
  here uses them.
- Measured: 167 of 167 `cadmus-ui` tests pass, and the library builds.

### `cadmus-part-taxo-ui`

- `TaxoStoreNodesPartComponent`:
  - The draft is `{ nodeIds: StringPair[] }`. The pairs are copied on the
    way in (`toDraft`) and on the way out (`getValue`).
  - Specs check that the bound part's objects stay free of FieldTree's
    identity Symbol. A save through the real save button emits a part
    whose `nodeIds` equal plain pairs. Replacing the outgoing copy with a
    spread makes that spec fail, because the Symbol leaks out (mutation
    check).
  - The template no longer reads `nodeIds.value`, a plain property, under
    `OnPush`. It now reads `form.nodeIds().value()`, a signal.
- Specs compare the draft's arrays through a JSON round-trip. The items
  carry the identity Symbol, as in iteration 1.
- Measured: 23 of 23 tests pass, and `cadmus-part-taxo-ui` and
  `cadmus-part-taxo-pg` build.

### `cadmus-part-general-ui`

All 33 form components: 24 part/fragment editors on the base class and 9
embedded sub-editors. Measured: 648 of 648 tests pass (36 spec files), the
library builds with no warnings, and `cadmus-part-general-pg` builds and
passes 268 of 268 tests unchanged.

Patterns:

- Part editors: `_draft = linkedSignal(() => toDraft(this.data()?.value))`
  and `form = this.createForm(this._draft, schema)`. Thesaurus entries
  became `computed()` over `data().thesauri`, replacing the
  `updateThesauri()` setters.
- Arrays whose items are objects (references, IDs, counts, links, ...)
  are copied on the way in and out with `copyFormValue()`, a
  `structuredClone` in the new internal `signal-form-utils.ts`.
  Measured, in the doc references spec:
  - the form's own copies carry FieldTree's identity Symbol;
  - the objects emitted by the child widget and the saved model carry
    none;
  - the spec for the helper checks that the clone drops Symbol keys and
    keeps `Date`s.
- Children receive a fresh copy of what they emitted. The bricks widgets
  involved were read for this: `DocReferencesComponent` keeps its draft
  when the incoming references equal its own (a `linkedSignal` with a
  `previous` check). `AssertedIdsComponent` derives nothing from its
  input. `NoteSetComponent` does reset its state on any new `set` object,
  so the flags part passes it a `noteSet` computed from data and
  settings only. A spec checks that the note set object stays the same
  across the editor's own changes.
- Sub-editors (model, not base class) use the same draft and form, plus
  an effect that resets the interaction state when the bound model
  changes.
  - **Bug found and fixed during this migration:** the first version of
    that effect read the draft instead of the model. The draft also
    changes with every keystroke, so each edit was reset to pristine at
    the next change detection. In the bib author and historical event
    editors, whose save button requires a dirty form, Save could then
    never be enabled.
  - A spec in each of the 8 sub-editors types into an input, runs change
    detection twice, and expects `dirty()`. With the draft-keyed effect
    restored in all 8, all 8 specs fail (plus the bib author Enter spec);
    with the fix, they pass.
- Rows (former `FormArray`s of `FormGroup`s: metadata, comment keywords,
  tiled data) are arrays in the draft with `applyEach` rules. The
  template iterates the field tree (`@for (g of form.metadata; track g)`).
  - The `_uid` counters and the per-row `valueChanges` subscriptions are
    gone.
  - A spec moves a touched row and checks that the touched state moves
    with it.
  - A row field named `value` works as a child field (measured in the
    metadata and comment specs, including typing into it).
- Text fields use `''` as the empty value (native inputs need non-null
  strings). The "(n/a)" and "-" options of the selects that share such a
  field now have the value `''`.
- `NG8022`-style rules: none of these templates had static validation
  attributes.

Enter key:

- Part editors render no `<form>`, as decided for the base class.
  Measured: each part editor spec has a test that the close/save buttons
  are inside no `<form>`. The categories editor's thesaurus tree renders
  its own `[formRoot]` filter form (`cadmus-thesaurus-store`, external).
  That is not nested in anything any more, so its test checks the buttons
  rather than the whole DOM.
- The sub-editors used to be nested `<form>`s with a submit button, so
  Enter in one of their text inputs saved the sub-item (browser implicit
  submission). This is kept by an explicit `(keydown.enter)` handler on
  their root, using the new `isImplicitSubmission(event)`:
  - it acts only on text-like `<input>`s, not on textareas, check boxes,
    selects or buttons;
  - it does nothing if another handler already consumed the event, e.g.
    an autocomplete picking an option;
  - it does nothing where the old save button would have been disabled
    (invalid, or pristine for the bib author and historical event
    editors).
  - The helper has its own spec. Specs in the related entity and bib
    author editors drive the real key events, including the disabled
    case.
- Enter-to-add is kept where it existed: new keyword (keywords part),
  bibliography keywords (both inputs), new datum (tiled data). Enter
  saves the text tile and a tiled-data row, as the submit of their forms
  did. Specs cover the keywords part, the text tile and tiled data.

Bugs fixed (each has a spec):

- Flags part:
  - The notes editor was bound with `[(set)]="notes.value"`, which wrote
    the raw control value and never marked anything dirty. Now note
    changes mark the form dirty (spec: `onSetChange` makes `isDirty()`
    true).
  - The note set was built from the settings available when data arrived
    (`getNoteSet()` returned an empty set if they were not loaded yet),
    and was never rebuilt when they arrived. The draft now depends on
    both. A spec resolves the settings after binding data. **Believed,
    not measured, for the old code:** the race happened in the app. To
    check, run the previous commit with slow settings loading.
  - Removed two debug `console.log`s.
- Tiled text part:
  - `(tileChange)="onTileChange($event)"` only marked the form dirty and
    never stored the edited tile. Read in the old source: the text tile
    emits a new tile object, and nothing put it into `rows`. Now the tile
    is replaced in its row; a spec saves a tile text edited this way.
  - `deleteSelectedTile()` selected `newTiles[index + 1]`, skipping the
    tile that moved into the deleted slot. Also, `adjustCoords()` cloned
    every tile, so the selection pointed to an object no longer
    displayed. The old specs pinned both behaviours. Now the tile in the
    deleted slot is selected, and renumbering keeps unchanged objects and
    remaps the selection.
  - The citation length error had an empty `<mat-error>`.
- Tiled data:
  - Read in the old sources: `addDatum()`/`deleteDatum()` set the `data`
    model at once, rebuilding it from the last saved data, not from the
    edits. The tiled text part handles `dataChange` by saving the data
    and closing the data editor. So adding a datum closed the editor and
    discarded the edits of other rows.
  - Now add and delete edit the draft; Save emits. Specs check that two
    adds emit nothing until save, and that other rows' edits survive an
    add.
  - Hidden keys can no longer be added from the form (`hidden` error,
    "reserved key"). Unchanged values keep their original type on save
    (the inputs edit text).
- Token text part: removed a debug `console.log`.
- Asserted historical date: the tag had no length rule, and its error
  key was the misspelled `max-length`, so "tag too long" could never
  appear. The dead message was removed rather than inventing a limit.

Behaviour changes, deliberate:

- Empty optional strings are saved as missing, not `''`: bibliography
  entry, historical event tag, chronology label/event ID, index keyword
  and comment keyword fields. Specs that pinned `''` were updated.
- `HistoricalEventEditorComponent.typeEntryPrefix` is computed from the
  type. With an empty type it is `undefined` (all relations), where it
  used to be `":"` (no relation matched).
- The bibliography entry keeps its old effective access date default,
  `null`. The `new Date()` initial value was always reset away, and a
  spec documented that.
- `MetadataPartComponent`, `CommentEditorComponent`: moving rows marks
  the form dirty (as before); `TiledDataComponent.keys` and
  `TextTileComponent.text` are computed signals.

Not changed, reported: `cadmus-thesaurus-store`'s tree filter renders a
`<form [formRoot]>`. That is fine for it, as a submission root, and it
is now never nested.
