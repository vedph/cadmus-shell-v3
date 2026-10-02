import {
  ChangeDetectionStrategy,
  Component,
  computed,
  linkedSignal,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Flag, FlagSetComponent } from '@myrmidon/cadmus-ui-flag-set';
import { NoteSet, NoteSetComponent } from '@myrmidon/cadmus-ui-note-set';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
  copyFormValue,
  setFieldFromChild,
} from '@myrmidon/cadmus-ui';
import { NgxToolsSignalValidators } from '@myrmidon/ngx-tools';

import { FLAGS_PART_TYPEID, FlagsPart } from '../flags-part';

function entryToFlag(entry: ThesaurusEntry): Flag {
  return {
    id: entry.id,
    label: entry.value,
  };
}

interface FlagsPartControls {
  flags: string[];
  notes: NoteSet;
}

/**
 * Bound part and note settings -> editable draft. The note set merges the
 * definitions from settings with the notes from the part; with no settings
 * there are no notes.
 */
function toDraft(
  part: FlagsPart | null | undefined,
  settings: NoteSet | undefined,
): FlagsPartControls {
  return {
    flags: [...(part?.flags || [])],
    notes: settings
      ? copyFormValue({ ...settings, notes: part?.notes || {} })
      : { definitions: [], notes: {} },
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
    MatButtonModule,
    MatCardModule,
    HelpLinkComponent,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlagsPartComponent extends ModelEditorComponentBase<FlagsPart> {
  // note settings
  public readonly settings = signal<NoteSet | undefined>(undefined);

  // flags
  public readonly flagEntries = computed<ThesaurusEntry[]>(
    () => this.data()?.thesauri?.['flags']?.entries || [],
  );

  // flags mapped from thesaurus entries
  public readonly featureFlags = computed<Flag[]>(
    () => this.flagEntries()?.map((e) => entryToFlag(e)) || [],
  );

  // the draft depends on settings too, which may be loaded after data
  private readonly _draft = linkedSignal(() =>
    toDraft(this.data()?.value, this.settings()),
  );
  public readonly form = this.createForm(this._draft, (p) => {
    NgxToolsSignalValidators.strictMinLength(p.flags, 1);
  });

  /**
   * The note set for the notes editor. It changes only with data or
   * settings, not with the editor's own changes: the editor resets its
   * state whenever it gets a different set object.
   */
  public readonly noteSet = computed<NoteSet>(
    () => toDraft(this.data()?.value, this.settings()).notes,
  );

  constructor() {
    super();
    // settings
    this.initSettings<NoteSet>(FLAGS_PART_TYPEID, (settings) => {
      this.settings.set(settings);
    });
  }

  public onFlagsCheckedIdsChange(ids: string[]): void {
    setFieldFromChild(this.form.flags, [...ids]);
  }

  public onSetChange(set: NoteSet): void {
    setFieldFromChild(this.form.notes, copyFormValue(set));
  }

  protected getValue(): FlagsPart {
    let part = this.getEditedPart(FLAGS_PART_TYPEID) as FlagsPart;
    const draft = this._draft();
    part.flags = [...draft.flags];

    // remove keys with null/undefined values
    const notesObj = draft.notes?.notes || {};
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
