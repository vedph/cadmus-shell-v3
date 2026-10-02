import {
  Component,
  computed,
  ChangeDetectionStrategy,
  linkedSignal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import {
  FormField,
  disabled,
  maxLength,
  required,
} from '@angular/forms/signals';

import { Clipboard } from '@angular/cdk/clipboard';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardSubtitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';

import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
} from '@myrmidon/cadmus-ui';
import {
  renderLabelFromLastColon,
  ThesaurusEntriesPickerComponent,
} from '@myrmidon/cadmus-thesaurus-store';
import {
  TextLayerService,
  ThesaurusEntry,
  EditedObject,
  TokenLocation,
} from '@myrmidon/cadmus-core';

import { OrthographyFragment } from '../orthography-fragment';
import { EditOperation } from '../services/edit-operation';
import { EditOperationSetComponent } from '../edit-operation-set/edit-operation-set.component';
import { setFieldFromChild } from '../signal-form-utils';

interface OrthographyFragmentControls {
  reference: string;
  language: string;
  tags: ThesaurusEntry[];
  note: string;
  operations: EditOperation[];
  textTarget: boolean;
}

function mapIdsToEntries(
  ids: string[],
  entries: ThesaurusEntry[] | undefined,
): ThesaurusEntry[] {
  return ids.map((id) => {
    const entry = entries?.find((e) => e.id === id);
    return entry ? { id: entry.id, value: entry.value } : { id, value: id };
  });
}

function parseOperations(fragment: OrthographyFragment): EditOperation[] {
  try {
    return (
      fragment.operations?.map((text) => EditOperation.parseOperation(text)) ||
      []
    );
  } catch (error) {
    console.error('Error parsing operations', error, fragment.operations);
    return [];
  }
}

/**
 * Bound data -> editable draft. The tag IDs are mapped to the entries of
 * the orthography-tags thesaurus, when present.
 */
function toDraft(
  data?: EditedObject<OrthographyFragment>,
): OrthographyFragmentControls {
  const fragment = data?.value;
  if (!fragment) {
    return {
      reference: '',
      language: '',
      tags: [],
      note: '',
      operations: [],
      textTarget: false,
    };
  }
  return {
    reference: fragment.reference || '',
    language: fragment.language || '',
    tags: mapIdsToEntries(
      fragment.tags || [],
      data?.thesauri?.['orthography-tags']?.entries,
    ),
    note: fragment.note || '',
    // operations are class instances: they are not deep-copied
    operations: parseOperations(fragment),
    textTarget: fragment.isTextTarget || false,
  };
}

/**
 * Orthography fragment.
 * Thesauri: orthography-languages, orthography-tags, orthography-op-tags.
 */
@Component({
  selector: 'cadmus-orthography-fragment',
  templateUrl: './orthography-fragment.component.html',
  styleUrls: ['./orthography-fragment.component.css'],
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
    MatCheckbox,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatSelect,
    MatOption,
    MatCardActions,
    TitleCasePipe,
    ThesaurusEntriesPickerComponent,
    CloseSaveButtonsComponent,
    // NB: only cadmus-edit-operation-set is used in the template; it embeds
    // cadmus-edit-operation itself. Importing EditOperationComponent here too
    // was dead code (NG8113 unused-import warning), removed.
    EditOperationSetComponent,
  ],
})
export class OrthographyFragmentComponent extends ModelEditorComponentBase<OrthographyFragment> {
  /**
   * The fragment text.
   */
  public readonly frText = computed<string | undefined>(() => {
    const data = this.data();
    return data?.baseText && data.value
      ? this._layerService.getTextFragment(
          data.baseText,
          TokenLocation.parse(data.value.location)!,
        )
      : undefined;
  });

  public readonly langEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['orthography-languages']?.entries,
  );
  public readonly tagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['orthography-tags']?.entries,
  );
  public readonly opTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['orthography-op-tags']?.entries,
  );

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.data()));
  public readonly form = this.createForm(this._draft, (p) => {
    required(p.reference);
    maxLength(p.reference, 100);
    // the reference cannot change once there are operations
    disabled(p.reference, () => this._draft().operations.length > 0);
    maxLength(p.language, 50);
    maxLength(p.note, 200);
  });

  /**
   * The source text: either the reference (if textTarget is true) or
   * the fragment text.
   */
  public readonly sourceText = computed<string | undefined>(() =>
    this.form.textTarget().value()
      ? this.form.reference().value()
      : this.frText(),
  );

  /**
   * The target text: either the fragment text (if textTarget is true) or
   * the reference.
   */
  public readonly targetText = computed<string | undefined>(() =>
    this.form.textTarget().value()
      ? this.frText()
      : this.form.reference().value(),
  );

  constructor(
    private _layerService: TextLayerService,
    private _clipboard: Clipboard,
    private _snackbar: MatSnackBar,
  ) {
    super();
  }

  public onTagEntriesChange(entries: ThesaurusEntry[]): void {
    setFieldFromChild(
      this.form.tags,
      entries.map((e) => ({ id: e.id, value: e.value })),
    );
  }

  protected override getValue(): OrthographyFragment {
    const fragment = this.getEditedFragment() as OrthographyFragment;
    const draft = this._draft();
    fragment.reference = draft.reference;
    fragment.language = draft.language.trim() || undefined;
    fragment.tags = draft.tags.length
      ? draft.tags.map((entry) => entry.id)
      : undefined;
    fragment.note = draft.note.trim() || undefined;
    fragment.operations = draft.operations.map((op) => op.toString());
    fragment.isTextTarget = draft.textTarget || undefined;
    return fragment;
  }

  public onOperationsChange(operations: EditOperation[]): void {
    setFieldFromChild(this.form.operations, operations);
  }

  public renderLabel(label: string): string {
    return renderLabelFromLastColon(label);
  }

  public onTagChange(tag: ThesaurusEntry): void {
    this._clipboard.copy(tag.id);
    this._snackbar.open('Tag copied: ' + tag.id, 'OK', {
      duration: 2000,
    });
  }
}
