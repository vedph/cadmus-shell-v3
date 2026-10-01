import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  linkedSignal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';

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
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';

import { NgxToolsSignalValidators } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';

import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
} from '@myrmidon/cadmus-ui';
import {
  TextLayerService,
  ThesaurusEntry,
  TokenLocation,
} from '@myrmidon/cadmus-core';

import { QuotationEntryComponent } from '../quotation-entry/quotation-entry.component';
import { QuotationsFragment, QuotationEntry } from '../quotations-fragment';
import { QuotationWorksService } from './quotation-works.service';
import { copyFormValue } from '../signal-form-utils';

interface QuotationsFragmentControls {
  entries: QuotationEntry[];
}

function toDraft(fragment?: QuotationsFragment | null): QuotationsFragmentControls {
  return { entries: copyFormValue(fragment?.entries || []) };
}

/**
 * Quotations fragment editor.
 * Thesauri: quotation-works (optional), quotation-tags (optional).
 */
@Component({
  selector: 'cadmus-quotations-fragment',
  templateUrl: './quotations-fragment.component.html',
  styleUrls: ['./quotations-fragment.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardHeader,
    HelpLinkComponent,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardSubtitle,
    MatCardContent,
    MatExpansionModule,
    MatIconButton,
    MatTooltip,
    MatButton,
    MatCardActions,
    TitleCasePipe,
    QuotationEntryComponent,
    CloseSaveButtonsComponent,
  ],
})
export class QuotationsFragmentComponent extends ModelEditorComponentBase<QuotationsFragment> {
  public readonly editedEntryIndex = signal<number>(-1);
  public readonly editedEntry = signal<QuotationEntry | undefined>(undefined);
  // the fragment's base text
  public readonly frText = computed<string | undefined>(() => {
    const data = this.data();
    return data?.baseText && data.value
      ? this._layerService.getTextFragment(
          data.baseText,
          TokenLocation.parse(data.value.location)!,
        )
      : undefined;
  });

  public readonly workEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['quotation-works']?.entries,
  );
  public readonly tagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['quotation-tags']?.entries,
  );
  public readonly workDictionary = computed(() =>
    this._worksService.buildDictionary(this.workEntries() || []),
  );

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    NgxToolsSignalValidators.strictMinLength(p.entries, 1);
  });

  constructor(
    private _layerService: TextLayerService,
    private _dialogService: DialogService,
    private _worksService: QuotationWorksService,
  ) {
    super();
  }

  protected getValue(): QuotationsFragment {
    const fr = this.getEditedFragment() as QuotationsFragment;
    fr.entries = copyFormValue(this._draft().entries);
    return fr;
  }

  public getNameFromId(id: string): string {
    return this.workEntries()?.find((e) => e.id === id)?.value || id;
  }

  public addEntry(): void {
    this.editEntry(
      {
        author: '',
        work: '',
        citation: '',
      },
      -1,
    );
  }

  public editEntry(entry: QuotationEntry, index: number): void {
    this.editedEntryIndex.set(index);
    this.editedEntry.set(structuredClone(entry));
  }

  public saveEntry(entry: QuotationEntry): void {
    // editedEntry is a signal: without invoking it (), this checked the
    // always-truthy function reference and never short-circuited.
    if (!this.editedEntry()) {
      return;
    }
    const entries = [...this.form.entries().value()];
    if (this.editedEntryIndex() === -1) {
      entries.push(entry);
    } else {
      entries.splice(this.editedEntryIndex(), 1, entry);
    }
    this.form.entries().value.set(entries);
    this.form.entries().markAsDirty();

    this.closeEntry();
  }

  public closeEntry(): void {
    // editedEntry is a signal: without invoking it (), this checked the
    // always-truthy function reference and never short-circuited.
    if (!this.editedEntry()) {
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
        const entries = [...this.form.entries().value()];
        entries.splice(index, 1);
        this.form.entries().value.set(entries);
        this.form.entries().markAsDirty();
      });
  }

  public moveEntryUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entry = this.form.entries().value()[index];
    const entries = [...this.form.entries().value()];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.form.entries().value.set(entries);
    this.form.entries().markAsDirty();
  }

  public moveEntryDown(index: number): void {
    if (index + 1 >= this.form.entries().value().length) {
      return;
    }
    const entry = this.form.entries().value()[index];
    const entries = [...this.form.entries().value()];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this.form.entries().value.set(entries);
    this.form.entries().markAsDirty();
  }
}
