# Migrating Code

## App

1. update Angular packages: run `ng update` and then update the listed packages, which typically are:

```bash
ng update @angular/core @angular/cli @angular/cdk @angular/material --force
```

2. for Angular 15 you also need to migrate Material (choose all directories and all components):

```bash
ng generate @angular/material:mdc-migration
```

3. install ELF packages:

```bash
npm i @ngneat/effects-ng @ngneat/elf @ngneat/elf-cli-ng @ngneat/elf-devtools @ngneat/elf-entities @ngneat/elf-pagination @ngneat/elf-requests --force
```

4. install other Cadmus packages:

```bash
npm i @myrmidon/ngx-dirty-check --force
```

5. update all the Cadmus-related packages to their latest versions in `package.json`, and then run `npm i --force`.

6. ensure that `placeholder` attributes in material controls are replaced with `mat-label` inside `mat-form-field`, e.g. this code:

```html
<mat-form-field *ngIf="witEntries?.length">
  <mat-select formControlName="id" placeholder="ID">
    <mat-option *ngFor="let e of witEntries" [value]="e.id">{{
      e.value
    }}</mat-option>
  </mat-select>
  <mat-error
    *ngIf="
      $any(item)['controls'].id.errors?.required &&
      ($any(item)['controls'].id.dirty ||
        $any(item)['controls'].id.touched)
    "
    >ID required</mat-error
  >
</mat-form-field>
```

becomes (removing `placholder` and adding `mat-label`):

```html
<mat-form-field *ngIf="witEntries?.length">
  <mat-label>ID</mat-label>
  <mat-select formControlName="id">
    <mat-option *ngFor="let e of witEntries" [value]="e.id">{{
      e.value
    }}</mat-option>
  </mat-select>
  <mat-error
    *ngIf="
      $any(item)['controls'].id.errors?.required &&
      ($any(item)['controls'].id.dirty ||
        $any(item)['controls'].id.touched)
    "
    >ID required</mat-error
  >
</mat-form-field>
```

7. update parts and fragments as specified below.

8. in `app.module.ts`, remove Akita packages and modules imports and add the following imports:

```ts
// ELF
import { devTools } from '@ngneat/elf-devtools';
import { Actions } from '@ngneat/effects-ng';

// myrmidon
import { NgxDirtyCheckModule } from '@myrmidon/ngx-dirty-check';
```

Add the corresponding modules to your app `imports` array:

```ts
NgxDirtyCheckModule,
```

Add the following entry to the providers array to enable ELF dev tools:

```ts
    // ELF dev tools
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: initElfDevTools,
      deps: [Actions],
    },
```

9. Just before the `@NgModule` attribute introducing the app module, add this function to enable ELF dev tools:

```ts
// https://ngneat.github.io/elf/docs/dev-tools/
export function initElfDevTools(actions: Actions) {
  return () => {
    devTools({
      name: 'Cadmus TGR',
      actionsDispatcher: actions,
    });
  };
}
```

10. in `app.component.ts` replace `AppQuery` and `AppService` with `AppRepository`:

```ts
import { AppRepository } from '@myrmidon/cadmus-state';
```

11. remove Akita packages:

```bash
npm uninstall @datorama/akita-ngdevtools @datorama/akita --force
```

>Note: due to changes in Angular Material styles, which often result in slightly bigger controls, if your UI defined custom sizes for some controls you might need to adjust them to fit.

## Part/Fragment Editors

1. pass `formBuilder` to the super ctor.
2. implement `ngOnInit` at least as (`initEditor` no more exists):

```ts
public override ngOnInit(): void {
  super.ngOnInit();
}
```

3. implement `buildForm` moving there the creation of the root form (previously in ctor):

```ts
protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
  return formBuilder.group({
    // ...
  });
}
```

4. change `onThesauriSet` into a private `updateThesauri` and call it from `onDataSet`, e.g.:

```ts
private updateThesauri(thesauri: ThesauriSet): void {
    let key = 'bibliography-languages';
    if (this.hasThesaurus(key)) {
      this.langEntries = thesauri[key].entries;
    } else {
      this.langEntries = undefined;
    }

    key = 'bibliography-types';
    if (this.hasThesaurus(key)) {
      this.typeEntries = thesauri[key].entries;
    } else {
      this.typeEntries = undefined;
    }
  }
```

5. ensure that `updateForm` is ok (ensure that it receives a part/fragment which can also be `undefined` or `null`) and call it from `OnDataSet`.

6. rename `onModelSet` to `onDataSet` and adjust it as required, like:

```ts
protected override onDataSet(data?: EditedObject<ChronotopesPart>): void {
  // thesauri
  if (data?.thesauri) {
    this.updateThesauri(data.thesauri);
  }

  // form
  this.updateForm(data?.value);
}
```

7. rename `getModelFromForm` to `getValue` and adjust, e.g.:

```ts
// for parts
protected getValue(): ChronotopesPart {
  let part = this.getEditedPart(CHRONOTOPES_PART_TYPEID) as ChronotopesPart;
  part.chronotopes = this.chronotopes.value;
  return part;
}

// for fragments
protected getValue(): OrthographyFragment {
  const fr = this.getEditedFragment() as OrthographyFragment;
  fr.standard = this.standard.value.trim();
  fr.operations = this.getOperations();
  return fr;
}
```

8. for fragments, in the template replace the location and base text references from `model?.location` and `model?.baseText` to `data?.value?.location` and `data?.baseText`.

>Note: `CadmusValidators` has been removed from core, as its functionalities are found in `NgxToolsValidators` (from `@myrmidon/ng-tools`). So, if your code was using these validators, just replace the validators class.

## Part Wrappers

1. remove all the state-related files.

2. replace the constructor:

```ts
import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';

  constructor(
    router: Router,
    route: ActivatedRoute,
    snackbar: MatSnackBar,
    itemService: ItemService,
    thesaurusService: ThesaurusService,
    editorService: PartEditorService
  ) {
    super(
      router,
      route,
      snackbar,
      itemService,
      thesaurusService,
      editorService
    );
  }
```

3. replace `ngOnInit` with `getReqThesauriIds` override when thesauri are required, else just remove it:

```ts
protected override getReqThesauriIds(): string[] {
  return [
    'bibliography-languages',
    'bibliography-types',
    'bibliography-tags',
    'bibliography-author-roles',
  ];
}
```

4. change the template like this:

```html
<cadmus-current-item-bar></cadmus-current-item-bar>
<cadmus-bibliography-part
  [identity]="identity"
  [data]="$any(data)"
  (dataChange)="save($event)"
  (editorClose)="close()"
  (dirtyChange)="onDirtyChange($event)"
></cadmus-bibliography-part>
```

## Fragment Wrappers

1. remove all the state-related files.

2. replace the constructor:

```ts
import {
  EditFragmentFeatureBase,
  FragmentEditorService,
} from '@myrmidon/cadmus-state';

  constructor(
    router: Router,
    route: ActivatedRoute,
    snackbar: MatSnackBar,
    editorService: FragmentEditorService,
    libraryRouteService: LibraryRouteService
  ) {
    super(router, route, snackbar, editorService, libraryRouteService);
  }
```

3. replace `ngOnInit` with `getReqThesauriIds` override when thesauri are required, else just remove it.

```ts
protected override getReqThesauriIds(): string[] {
  return [
    // ...
  ];
}
```

4. change the template like this:

```html
<cadmus-current-item-bar></cadmus-current-item-bar>
<div class="base-text">
  <cadmus-decorated-token-text
    [baseText]="data?.baseText || ''"
    [locations]="frLoc ? [frLoc] : []"
  ></cadmus-decorated-token-text>
</div>
<cadmus-chronology-fragment
  [data]="$any(data)"
  (dataChange)="save($event)"
  (editorClose)="close()"
  (dirtyChange)="onDirtyChange($event)"
></cadmus-chronology-fragment>
```
