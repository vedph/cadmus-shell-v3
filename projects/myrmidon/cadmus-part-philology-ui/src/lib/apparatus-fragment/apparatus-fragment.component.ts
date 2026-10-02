import {
  ChangeDetectionStrategy,
  Component,
  signal,
  computed,
  linkedSignal,
} from '@angular/core';
import { FormField, maxLength } from '@angular/forms/signals';
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
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatInput } from '@angular/material/input';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';

import { NgxToolsSignalValidators, SafeHtmlPipe } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';

import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
  copyFormValue,
} from '@myrmidon/cadmus-ui';
import {
  EditedObject,
  TextLayerService,
  ThesaurusEntry,
  TokenLocation,
} from '@myrmidon/cadmus-core';

import { ApparatusEntryComponent } from '../apparatus-entry/apparatus-entry.component';
import { ApparatusEntryType, ApparatusEntry } from '../apparatus-fragment';
import { ApparatusFragment } from '../apparatus-fragment';
import { ApparatusEntrySummaryService } from './apparatus-entry-summary.service';

interface ApparatusFragmentControls {
  tag: string;
  entries: ApparatusEntry[];
}

function toDraft(
  fragment?: ApparatusFragment | null,
): ApparatusFragmentControls {
  return {
    tag: fragment?.tag || '',
    entries: copyFormValue(fragment?.entries || []),
  };
}

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
    FormField,
    MatCard,
    MatCardHeader,
    HelpLinkComponent,
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
export class ApparatusFragmentComponent extends ModelEditorComponentBase<ApparatusFragment> {
  // thesauri
  public readonly tagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['apparatus-tags']?.entries,
  );
  public readonly witEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['apparatus-witnesses']?.entries,
  );
  public readonly authEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['apparatus-authors']?.entries,
  );
  public readonly authTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['apparatus-author-tags']?.entries,
  );
  /**
   * Author/work tags. This can be alternative or additional
   * to authEntries, and allows picking the work from a tree
   * of authors and works.
   */
  public readonly workEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['author-works']?.entries,
  );

  public readonly editedEntryIndex = signal<number>(-1);
  public readonly editedEntry = signal<ApparatusEntry | undefined>(undefined);
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
  public readonly summary = signal<string | undefined>(undefined);

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    maxLength(p.tag, 50);
    NgxToolsSignalValidators.strictMinLength(p.entries, 1);
  });

  constructor(
    private _layerService: TextLayerService,
    private _dialogService: DialogService,
    private _summaryService: ApparatusEntrySummaryService,
  ) {
    super();
  }

  protected override onDataSet(data?: EditedObject<ApparatusFragment>): void {
    this.summary.set(
      data?.value ? this._summaryService.build(data.value) : undefined,
    );
  }

  protected getValue(): ApparatusFragment {
    const fr = this.getEditedFragment() as ApparatusFragment;
    fr.tag = this._draft().tag.trim() || undefined;
    fr.entries = copyFormValue(this._draft().entries);
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
    // BUG FIX: was checking the signal reference itself (always truthy),
    // not its value, so this guard never triggered. Must invoke the signal.
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

    this.summary.set(this._summaryService.build(this.getValue()));
    this.closeEntry();
  }

  public closeEntry(): void {
    // BUG FIX: same unwrapped-signal guard issue as saveEntry() above.
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

        this.summary.set(this._summaryService.build(this.getValue()));
      });
  }

  public moveEntryUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entries = [...this.form.entries().value()];
    const entry = entries[index];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.form.entries().value.set(entries);
    this.form.entries().markAsDirty();

    this.summary.set(this._summaryService.build(this.getValue()));
  }

  public moveEntryDown(index: number): void {
    if (index + 1 >= this.form.entries().value().length) {
      return;
    }
    const entries = [...this.form.entries().value()];
    const entry = entries[index];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);

    this.form.entries().value.set(entries);
    this.form.entries().markAsDirty();

    this.summary.set(this._summaryService.build(this.getValue()));
  }
}
