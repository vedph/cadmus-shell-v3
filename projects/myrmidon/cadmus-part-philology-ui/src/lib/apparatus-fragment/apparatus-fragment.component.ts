import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import {
  FormControl,
  FormBuilder,
  Validators,
  FormGroup,
  UntypedFormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardSubtitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatInput } from '@angular/material/input';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';

import { NgxToolsValidators, SafeHtmlPipe } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';

import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
} from '@myrmidon/cadmus-ui';
import {
  TextLayerService,
  ThesauriSet,
  ThesaurusEntry,
  TokenLocation,
  EditedObject,
} from '@myrmidon/cadmus-core';

import { ApparatusEntryComponent } from '../apparatus-entry/apparatus-entry.component';
import { ApparatusEntryType, ApparatusEntry } from '../apparatus-fragment';
import { ApparatusFragment } from '../apparatus-fragment';
import { ApparatusEntrySummaryService } from './apparatus-entry-summary.service';

/**
 * Critical apparatus fragment.
 * Thesauri: apparatus-tags, apparatus-witnesses, apparatus-authors,
 * apparatus-author-tags, author-works.
 */
@Component({
  selector: 'cadmus-apparatus-fragment',
  templateUrl: './apparatus-fragment.component.html',
  styleUrls: ['./apparatus-fragment.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardSubtitle,
    MatCardContent,
    MatFormField,
    MatExpansionModule,
    MatLabel,
    MatSelect,
    MatOption,
    MatInput,
    MatError,
    MatIconButton,
    MatTooltip,
    MatButton,
    ApparatusEntryComponent,
    MatCardActions,
    TitleCasePipe,
    SafeHtmlPipe,
    CloseSaveButtonsComponent,
  ],
})
export class ApparatusFragmentComponent
  extends ModelEditorComponentBase<ApparatusFragment>
  implements OnInit
{
  // thesauri
  public readonly tagEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  public readonly witEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  public readonly authEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  public readonly authTagEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  /**
   * Author/work tags. This can be alternative or additional
   * to authEntries, and allows picking the work from a tree
   * of authors and works.
   */
  public readonly workEntries = signal<ThesaurusEntry[] | undefined>(undefined);

  public readonly editedEntryIndex = signal<number>(-1);
  public readonly editedEntry = signal<ApparatusEntry | undefined>(undefined);
  public readonly frText = signal<string | undefined>(undefined);
  public readonly summary = signal<string | undefined>(undefined);

  public tag: FormControl<string | null>;
  public entries: FormControl<ApparatusEntry[]>;

  constructor(
    authService: AuthJwtService,
    formBuilder: FormBuilder,
    private _layerService: TextLayerService,
    private _dialogService: DialogService,
    private _summaryService: ApparatusEntrySummaryService,
  ) {
    super(authService, formBuilder);
    // form
    this.entries = formBuilder.control([], {
      validators: NgxToolsValidators.strictMinLengthValidator(1),
      nonNullable: true,
    });
    this.tag = formBuilder.control(null, Validators.maxLength(50));
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      tag: this.tag,
      entries: this.entries,
    });
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    let key = 'apparatus-tags';
    if (this.hasThesaurus(key)) {
      this.tagEntries.set(thesauri[key].entries);
    } else {
      this.tagEntries.set(undefined);
    }

    key = 'apparatus-witnesses';
    if (this.hasThesaurus(key)) {
      this.witEntries.set(thesauri[key].entries);
    } else {
      this.witEntries.set(undefined);
    }

    key = 'apparatus-authors';
    if (this.hasThesaurus(key)) {
      this.authEntries.set(thesauri[key].entries);
    } else {
      this.authEntries.set(undefined);
    }

    key = 'apparatus-author-tags';
    if (this.hasThesaurus(key)) {
      this.authTagEntries.set(thesauri[key].entries);
    } else {
      this.authTagEntries.set(undefined);
    }

    key = 'author-works';
    if (this.hasThesaurus(key)) {
      this.workEntries.set(thesauri[key].entries);
    } else {
      this.workEntries.set(undefined);
    }
  }

  private updateForm(fragment?: ApparatusFragment | null): void {
    if (!fragment) {
      this.summary.set(undefined);
      this.form?.reset();
      return;
    }
    this.summary.set(this._summaryService.build(fragment));
    this.tag.setValue(fragment.tag || null);
    this.entries.setValue(fragment.entries || []);
    this.form.markAsPristine();
  }

  protected override onDataSet(data?: EditedObject<ApparatusFragment>): void {
    // fragment's text
    if (data?.baseText && data.value) {
      this.frText.set(
        this._layerService.getTextFragment(
          data.baseText,
          TokenLocation.parse(data.value.location)!,
        ),
      );
    }

    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  protected getValue(): ApparatusFragment {
    const fr = this.getEditedFragment() as ApparatusFragment;
    fr.tag = this.tag.value?.trim();
    fr.entries = this.entries.value;
    return fr;
  }

  public getEntryTypeDsc(type: number): string {
    switch (type) {
      case 1:
        return 'Addition before';
      case 2:
        return 'Addition after';
      case 3:
        return 'Note';
      default:
        return 'Replacement';
    }
  }

  public getEntryTypeIcon(type: number): string {
    switch (type) {
      case 1:
        return 'skip_next';
      case 2:
        return 'skip_previous';
      case 3:
        return 'chat';
      default:
        return 'content_copy';
    }
  }

  public addEntry(): void {
    this.editEntry({ type: ApparatusEntryType.replacement }, -1);
  }

  public editEntry(entry: ApparatusEntry, index: number): void {
    this.editedEntryIndex.set(index);
    this.editedEntry.set(structuredClone(entry));
  }

  public saveEntry(entry: ApparatusEntry): void {
    if (!this.editedEntry) {
      return;
    }
    const entries = [...this.entries.value];
    if (this.editedEntryIndex() === -1) {
      entries.push(entry);
    } else {
      entries.splice(this.editedEntryIndex(), 1, entry);
    }
    this.entries.setValue(entries);
    this.entries.markAsDirty();
    this.entries.updateValueAndValidity();

    this.summary.set(this._summaryService.build(this.getValue()));
    this.closeEntry();
  }

  public closeEntry(): void {
    if (!this.editedEntry) {
      return;
    }
    this.editedEntryIndex.set(-1);
    this.editedEntry.set(undefined);
  }

  public removeEntry(index: number): void {
    this._dialogService
      .confirm('Confirm Deletion', 'Delete entry?')
      .subscribe((result) => {
        if (!result) {
          return;
        }
        const entries = [...this.entries.value];
        entries.splice(index, 1);
        this.entries.setValue(entries);
        this.entries.markAsDirty();
        this.entries.updateValueAndValidity();

        this.summary.set(this._summaryService.build(this.getValue()));
      });
  }

  public moveEntryUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entries = [...this.entries.value];
    const entry = entries[index];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.entries.setValue(entries);
    this.entries.markAsDirty();
    this.entries.updateValueAndValidity();

    this.summary.set(this._summaryService.build(this.getValue()));
  }

  public moveEntryDown(index: number): void {
    if (index + 1 >= this.entries.value.length) {
      return;
    }
    const entries = [...this.entries.value];
    const entry = entries[index];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);

    this.entries.setValue(entries);
    this.entries.markAsDirty();
    this.entries.updateValueAndValidity();

    this.summary.set(this._summaryService.build(this.getValue()));
  }
}
