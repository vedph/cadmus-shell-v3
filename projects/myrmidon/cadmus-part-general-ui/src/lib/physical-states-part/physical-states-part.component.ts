import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  FormBuilder,
  FormGroup,
  UntypedFormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
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

import { NgxToolsValidators, FlatLookupPipe } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import {
  PhysicalState,
  PhysicalStateComponent,
} from '@myrmidon/cadmus-mat-physical-state';

import { ThesauriSet, ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  EditedObject,
  ModelEditorComponentBase,
} from '@myrmidon/cadmus-ui';

import {
  PHYSICAL_STATES_PART_TYPEID,
  PhysicalStatesPart,
} from '../physical-states-part';

/**
 * PhysicalStatesPart editor component.
 * Thesauri: physical-states (optional), physical-state-features (optional),
 * physical-state-reporters (optional).
 */
@Component({
  selector: 'cadmus-physical-states-part',
  templateUrl: './physical-states-part.component.html',
  styleUrl: './physical-states-part.component.scss',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
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
export class PhysicalStatesPartComponent
  extends ModelEditorComponentBase<PhysicalStatesPart>
  implements OnInit
{
  public editedIndex: number;
  public edited: PhysicalState | undefined;

  // physical-states
  public stateEntries?: ThesaurusEntry[];
  // physical-state-features
  public featEntries?: ThesaurusEntry[];
  // physical-state-reporters
  public reporterEntries?: ThesaurusEntry[];

  public entries: FormControl<PhysicalState[]>;

  constructor(
    authService: AuthJwtService,
    formBuilder: FormBuilder,
    private _dialogService: DialogService
  ) {
    super(authService, formBuilder);
    this.editedIndex = -1;
    // form
    this.entries = formBuilder.control([], {
      // at least 1 entry
      validators: NgxToolsValidators.strictMinLengthValidator(1),
      nonNullable: true,
    });
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      entries: this.entries,
    });
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    let key = 'physical-states';
    if (this.hasThesaurus(key)) {
      this.stateEntries = thesauri[key].entries;
    } else {
      this.stateEntries = undefined;
    }
    key = 'physical-state-features';
    if (this.hasThesaurus(key)) {
      this.featEntries = thesauri[key].entries;
    } else {
      this.featEntries = undefined;
    }
    key = 'physical-state-reporters';
    if (this.hasThesaurus(key)) {
      this.reporterEntries = thesauri[key].entries;
    } else {
      this.reporterEntries = undefined;
    }
  }

  private updateForm(part?: PhysicalStatesPart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    this.entries.setValue(part.states || []);
    this.form.markAsPristine();
  }

  protected override onDataSet(data?: EditedObject<PhysicalStatesPart>): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  protected getValue(): PhysicalStatesPart {
    let part = this.getEditedPart(
      PHYSICAL_STATES_PART_TYPEID
    ) as PhysicalStatesPart;
    part.states = this.entries.value || [];
    return part;
  }

  public addState(): void {
    const state: PhysicalState = {
      type: this.stateEntries?.length ? this.stateEntries[0].id : '',
    };
    this.editState(state, -1);
  }

  public editState(entry: PhysicalState, index: number): void {
    this.editedIndex = index;
    this.edited = entry;
  }

  public closeState(): void {
    this.editedIndex = -1;
    this.edited = undefined;
  }

  public saveState(entry: PhysicalState): void {
    const entries = [...this.entries.value];
    if (this.editedIndex === -1) {
      entries.push(entry);
    } else {
      entries.splice(this.editedIndex, 1, entry);
    }
    this.entries.setValue(entries);
    this.entries.markAsDirty();
    this.entries.updateValueAndValidity();
    this.closeState();
  }

  public deleteState(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete state?')
      .subscribe((yes: boolean | undefined) => {
        if (yes) {
          if (this.editedIndex === index) {
            this.closeState();
          }
          const entries = [...this.entries.value];
          entries.splice(index, 1);
          this.entries.setValue(entries);
          this.entries.markAsDirty();
          this.entries.updateValueAndValidity();
        }
      });
  }

  public moveStateUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entry = this.entries.value[index];
    const entries = [...this.entries.value];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.entries.setValue(entries);
    this.entries.markAsDirty();
    this.entries.updateValueAndValidity();
  }

  public moveStateDown(index: number): void {
    if (index + 1 >= this.entries.value.length) {
      return;
    }
    const entry = this.entries.value[index];
    const entries = [...this.entries.value];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this.entries.setValue(entries);
    this.entries.markAsDirty();
    this.entries.updateValueAndValidity();
  }
}
