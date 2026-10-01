import {
  ChangeDetectionStrategy,
  Component,
  computed,
  linkedSignal,
  signal,
} from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';

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

import { NgxToolsSignalValidators, FlatLookupPipe } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import {
  PhysicalState,
  PhysicalStateComponent,
} from '@myrmidon/cadmus-mat-physical-state';

import {
  ThesaurusEntry,
} from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
} from '@myrmidon/cadmus-ui';

import {
  PHYSICAL_STATES_PART_TYPEID,
  PhysicalStatesPart,
} from '../physical-states-part';
import { copyFormValue } from '../signal-form-utils';

interface PhysicalStatesPartControls {
  entries: PhysicalState[];
}

function toDraft(part?: PhysicalStatesPart | null): PhysicalStatesPartControls {
  return { entries: copyFormValue(part?.states || []) };
}

/**
 * PhysicalStatesPart editor component.
 * Thesauri: physical-states (optional), physical-state-features (optional),
 * physical-state-reporters (optional).
 */
@Component({
  selector: 'cadmus-physical-states-part',
  templateUrl: './physical-states-part.component.html',
  styleUrl: './physical-states-part.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardHeader,
    HelpLinkComponent,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardContent,
    MatExpansionModule,
    MatButton,
    MatIconButton,
    MatTooltip,
    PhysicalStateComponent,
    MatCardActions,
    DatePipe,
    TitleCasePipe,
    FlatLookupPipe,
    CloseSaveButtonsComponent,
  ],
})
export class PhysicalStatesPartComponent extends ModelEditorComponentBase<PhysicalStatesPart> {
  // state
  public readonly editedIndex = signal<number>(-1);
  public readonly edited = signal<PhysicalState | undefined>(undefined);

  // thesauri:
  // physical-states
  public readonly stateEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['physical-states']?.entries,
  );
  // physical-state-features
  public readonly featEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['physical-state-features']?.entries,
  );
  // physical-state-reporters
  public readonly reporterEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['physical-state-reporters']?.entries,
  );

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    NgxToolsSignalValidators.strictMinLength(p.entries, 1);
  });

  constructor(private _dialogService: DialogService) {
    super();
  }

  protected getValue(): PhysicalStatesPart {
    let part = this.getEditedPart(
      PHYSICAL_STATES_PART_TYPEID,
    ) as PhysicalStatesPart;
    part.states = copyFormValue(this._draft().entries);
    return part;
  }

  public addState(): void {
    const state: PhysicalState = {
      type: this.stateEntries()?.length ? this.stateEntries()![0].id : '',
    };
    this.editState(state, -1);
  }

  public editState(entry: PhysicalState, index: number): void {
    this.editedIndex.set(index);
    this.edited.set(structuredClone(entry));
  }

  public closeState(): void {
    this.editedIndex.set(-1);
    this.edited.set(undefined);
  }

  public saveState(entry: PhysicalState): void {
    const entries = [...this.form.entries().value()];
    if (this.editedIndex() === -1) {
      entries.push(entry);
    } else {
      entries.splice(this.editedIndex(), 1, entry);
    }
    this.form.entries().value.set(entries);
    this.form.entries().markAsDirty();
    this.closeState();
  }

  public deleteState(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete state?')
      .subscribe((yes: boolean | undefined) => {
        if (yes) {
          if (this.editedIndex() === index) {
            this.closeState();
          }
          const entries = [...this.form.entries().value()];
          entries.splice(index, 1);
          this.form.entries().value.set(entries);
          this.form.entries().markAsDirty();
        }
      });
  }

  public moveStateUp(index: number): void {
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

  public moveStateDown(index: number): void {
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
