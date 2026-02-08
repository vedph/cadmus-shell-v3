import { Component, computed, OnInit, signal } from '@angular/core';
import {
  FormControl,
  FormBuilder,
  FormGroup,
  UntypedFormGroup,
  ReactiveFormsModule,
} from '@angular/forms';

import { CommonModule, KeyValue } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { Flag, FlagSetComponent } from '@myrmidon/cadmus-ui-flag-set';
import { NoteSet, NoteSetComponent } from '@myrmidon/cadmus-ui-note-set';
import {
  EditedObject,
  ThesauriSet,
  ThesaurusEntry,
} from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
} from '@myrmidon/cadmus-ui';
import { NgxToolsValidators } from '@myrmidon/ngx-tools';

import { FLAGS_PART_TYPEID, FlagsPart } from '../flags-part';

function entryToFlag(entry: ThesaurusEntry): Flag {
  return {
    id: entry.id,
    label: entry.value,
  };
}

/**
 * Flags part editor component.
 * Thesauri: flags.
 * Settings: note set definitions for this part type (and role). If not defined,
 * no notes will be available.
 * See https://github.com/vedph/cadmus-bricks-shell-v3/blob/master/projects/myrmidon/cadmus-ui-note-set/README.md.
 */
@Component({
  selector: 'cadmus-flags-part',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    // cadmus
    FlagSetComponent,
    NoteSetComponent,
    CloseSaveButtonsComponent,
  ],
  templateUrl: './flags-part.component.html',
  styleUrl: './flags-part.component.css',
})
export class FlagsPartComponent
  extends ModelEditorComponentBase<FlagsPart>
  implements OnInit
{
  public flags: FormControl<string[]>;
  public notes: FormControl<NoteSet>;

  // note settings
  public readonly settings = signal<NoteSet | undefined>(undefined);

  // flags
  public readonly flagEntries = signal<ThesaurusEntry[]>([]);

  // flags mapped from thesaurus entries
  public featureFlags = computed<Flag[]>(
    () => this.flagEntries()?.map((e) => entryToFlag(e)) || [],
  );

  constructor(authService: AuthJwtService, formBuilder: FormBuilder) {
    super(authService, formBuilder);
    // form
    this.flags = formBuilder.control([], {
      validators: NgxToolsValidators.strictMinLengthValidator(1),
      nonNullable: true,
    });
    this.notes = formBuilder.control<NoteSet>(
      { definitions: [], notes: {} },
      {
        nonNullable: true,
      },
    );
    // settings
    this.initSettings<NoteSet>(FLAGS_PART_TYPEID, (settings) => {
      this.settings.set(settings);
    });
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      flags: this.flags,
      notes: this.notes,
    });
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    const key = 'flags';
    if (this.hasThesaurus(key)) {
      this.flagEntries.set(thesauri[key].entries || []);
    } else {
      this.flagEntries.set([]);
    }
  }

  private getNoteSet(part: FlagsPart): NoteSet {
    // no notes if no settings defining them
    if (!this.settings()) {
      return { definitions: [], notes: {} };
    }

    // build a note set by merging definitions from settings with notes from part
    return { ...this.settings()!, notes: part.notes || {} };
  }

  private updateForm(part?: FlagsPart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    // flags
    this.flags.setValue(part.flags || []);
    // notes
    this.notes.setValue(this.getNoteSet(part));

    this.form.markAsPristine();
  }

  protected override onDataSet(data?: EditedObject<FlagsPart>): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  public onFlagsCheckedIdsChange(ids: string[]): void {
    this.flags.setValue(ids);
    this.flags.markAsDirty();
    this.flags.updateValueAndValidity();
  }

  public onNoteChange(note: KeyValue<string, string | null>): void {
    console.log(`Note "${note.key}" changed to: ${note.value}`);
  }

  public onSetChange(set: NoteSet): void {
    console.log('Complete set updated:', set);
    this.notes.setValue(set);
  }

  protected getValue(): FlagsPart {
    let part = this.getEditedPart(FLAGS_PART_TYPEID) as FlagsPart;
    part.flags = this.flags.value || [];

    // remove keys with null/undefined values
    const notesObj = this.notes.value?.notes || {};
    const filteredNotes: { [key: string]: any } = {};
    for (const key of Object.keys(notesObj)) {
      if (notesObj[key] != null) {
        filteredNotes[key] = notesObj[key];
      }
    }
    part.notes =
      Object.keys(filteredNotes).length > 0 ? filteredNotes : undefined;

    return part;
  }
}
