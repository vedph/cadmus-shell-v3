import {
  ChangeDetectionStrategy,
  Component,
  computed,
  linkedSignal,
  signal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { take } from 'rxjs/operators';

import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';

import { NgxToolsSignalValidators } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import {
  AssertedProperName,
  ProperNameComponent,
  CadmusProperNamePipe,
} from '@myrmidon/cadmus-refs-proper-name';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
  copyFormValue,
} from '@myrmidon/cadmus-ui';

import { NamesPart, NAMES_PART_TYPEID } from '../names-part';

interface NamesPartControls {
  names: AssertedProperName[];
}

function toDraft(part?: NamesPart | null): NamesPartControls {
  return { names: copyFormValue(part?.names || []) };
}

/**
 * Names part editor component.
 * Thesauri: name-languages, name-tags, name-piece-types, assertion-tags,
 * doc-reference-types, doc-reference-tags (all optional).
 */
@Component({
  selector: 'cadmus-names-part',
  templateUrl: './names-part.component.html',
  styleUrls: ['./names-part.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardHeader,
    HelpLinkComponent,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardContent,
    MatButton,
    MatIconButton,
    MatTooltip,
    MatExpansionModule,
    ProperNameComponent,
    MatCardActions,
    TitleCasePipe,
    CadmusProperNamePipe,
    CloseSaveButtonsComponent,
  ],
})
export class NamesPartComponent extends ModelEditorComponentBase<NamesPart> {
  public readonly edited = signal<AssertedProperName | undefined>(undefined);
  public readonly editedIndex = signal<number>(-1);

  /**
   * The optional thesaurus proper name languages entries (name-languages).
   */
  public readonly langEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['name-languages']?.entries,
  );
  /**
   * The optional thesaurus name's tag entries (name-tags).
   */
  public readonly tagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['name-tags']?.entries,
  );
  /**
   * The optional thesaurus name piece's type entries (name-piece-types).
   */
  public readonly typeEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['name-piece-types']?.entries,
  );
  // thesauri for assertions:
  // assertion-tags
  public readonly assTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['assertion-tags']?.entries,
  );
  // doc-reference-types
  public readonly refTypeEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['doc-reference-types']?.entries,
  );
  // doc-reference-tags
  public readonly refTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['doc-reference-tags']?.entries,
  );

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    NgxToolsSignalValidators.strictMinLength(p.names, 1);
  });

  constructor(private _dialogService: DialogService) {
    super();
  }

  protected getValue(): NamesPart {
    let part = this.getEditedPart(NAMES_PART_TYPEID) as NamesPart;
    part.names = copyFormValue(this._draft().names);
    return part;
  }

  public addName(): void {
    const name: AssertedProperName = {
      language: this.langEntries()?.length ? this.langEntries()![0].id : '',
      pieces: [],
    };
    this.form.names().value.set([...(this.form.names().value() || []), name]);
    this.form.names().markAsDirty();
    this.editName(this.form.names().value().length - 1);
  }

  public editName(index: number): void {
    if (index < 0) {
      this.editedIndex.set(-1);
      this.edited.set(undefined);
    } else {
      this.editedIndex.set(index);
      this.edited.set(structuredClone(this.form.names().value()[index]));
    }
  }

  public onNameChange(name: AssertedProperName | undefined): void {
    if (name) {
      // else update replacing the old with the new name
      this.form.names().value.set(
        this.form
          .names()
          .value()
          .map((n: AssertedProperName, i: number) =>
            i === this.editedIndex() ? name : n,
          ),
      );
      this.form.names().markAsDirty();
    }
  }

  public onNameClose(): void {
    this.editName(-1);
  }

  public deleteName(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete name?')
      .pipe(take(1))
      .subscribe((yes) => {
        if (yes) {
          const names = [...this.form.names().value()];
          names.splice(index, 1);
          this.form.names().value.set(names);
          this.form.names().markAsDirty();
        }
      });
  }

  public moveNameUp(index: number): void {
    if (index < 1) {
      return;
    }
    const name = this.form.names().value()[index];
    const names = [...this.form.names().value()];
    names.splice(index, 1);
    names.splice(index - 1, 0, name);
    this.form.names().value.set(names);
    this.form.names().markAsDirty();
  }

  public moveNameDown(index: number): void {
    if (index + 1 >= this.form.names().value().length) {
      return;
    }
    const name = this.form.names().value()[index];
    const names = [...this.form.names().value()];
    names.splice(index, 1);
    names.splice(index + 1, 0, name);
    this.form.names().value.set(names);
    this.form.names().markAsDirty();
  }
}
