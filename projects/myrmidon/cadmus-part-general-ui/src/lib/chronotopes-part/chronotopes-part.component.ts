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

import { NgxToolsSignalValidators, RamStorageService } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import {
  AssertedChronotope,
  AssertedChronotopeComponent,
  AssertedChronotopesPipe,
} from '@myrmidon/cadmus-refs-asserted-chronotope';
import { HistoricalDatePipe } from '@myrmidon/cadmus-refs-historical-date';

import {
  ThesaurusEntry,
} from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
} from '@myrmidon/cadmus-ui';
import { MatExpansionModule } from '@angular/material/expansion';
import {
  LOOKUP_CONFIGS_KEY,
  LookupProviderOptions,
  RefLookupConfig,
} from '@myrmidon/cadmus-refs-lookup';

import { ChronotopesPart, CHRONOTOPES_PART_TYPEID } from '../chronotopes-part';
import { copyFormValue } from '../signal-form-utils';

interface ChronotopesPartControls {
  chronotopes: AssertedChronotope[];
}

function toDraft(part?: ChronotopesPart | null): ChronotopesPartControls {
  return { chronotopes: copyFormValue(part?.chronotopes || []) };
}

interface ChronotopesPartSettings {
  placeLookupServiceId?: string;
  lookupProviderOptions?: LookupProviderOptions;
}

/**
 * Chronotopes part editor component.
 * Thesauri: chronotope-place-tags, chronotope-assertion-tags,
 * doc-reference-types, doc-reference-tags (all optional).
 * Settings:
 * - placeLookupServiceId (optional): if specified, the ID of the place
 *   lookup service to use; if not specified, the place can be freely typed by the user.
 * - lookupProviderOptions (optional): if specified, the options for the lookup provider.
 *   When specified, it is assumed that there is a corresponding configuration in
 *   `RamStorageService` with the same ID.
 */
@Component({
  selector: 'cadmus-chronotopes-part',
  templateUrl: './chronotopes-part.component.html',
  styleUrls: ['./chronotopes-part.component.css'],
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
    AssertedChronotopeComponent,
    MatCardActions,
    TitleCasePipe,
    HistoricalDatePipe,
    AssertedChronotopesPipe,
    CloseSaveButtonsComponent,
  ],
})
export class ChronotopesPartComponent extends ModelEditorComponentBase<ChronotopesPart> {
  // state
  public readonly editedIndex = signal<number>(-1);
  public readonly edited = signal<AssertedChronotope | undefined>(undefined);

  // thesauri:
  // chronotope-place-tags
  public readonly tagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['chronotope-place-tags']?.entries,
  );
  // chronotope-assertion-tags
  public readonly assTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['chronotope-assertion-tags']?.entries,
  );
  // doc-reference-types
  public readonly refTypeEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['doc-reference-types']?.entries,
  );
  // doc-reference-tags
  public readonly refTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['doc-reference-tags']?.entries,
  );

  /**
   * The optional configuration of the place lookup service, if any. If not set,
   * the place can be freely typed by the user; if set, the place must be selected from
   * the lookup results.
   * This setting is specified by the part editor when loading data, by fetching
   * backend settings with a property named `placeLookupServerId`. When this is specified,
   * it is assumed that there is a corresponding configuration in `RamStorageService` with
   * the same ID.
   */
  public readonly placeLookupConfig = signal<RefLookupConfig | undefined>(
    undefined,
  );

  // lookup options depending on role
  public readonly lookupProviderOptions = signal<
    LookupProviderOptions | undefined
  >(undefined);

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    NgxToolsSignalValidators.strictMinLength(p.chronotopes, 1);
  });

  constructor(
    private _dialogService: DialogService,
    private _storage: RamStorageService,
  ) {
    super();
    // settings
    this.initSettings<ChronotopesPartSettings>(
      CHRONOTOPES_PART_TYPEID,
      (settings) => this.updateSettings(settings),
    );
  }

  private updateSettings(settings: ChronotopesPartSettings | undefined): void {
    // place lookup config
    if (settings?.placeLookupServiceId) {
      const configs: RefLookupConfig[] =
        this._storage.retrieve(LOOKUP_CONFIGS_KEY) || [];
      const config = configs.find(
        (c) => c.service?.id === settings.placeLookupServiceId!,
      );
      this.placeLookupConfig.set(config);
    } else {
      this.placeLookupConfig.set(undefined);
    }
    // lookup provider options
    this.lookupProviderOptions.set(
      settings?.lookupProviderOptions || undefined,
    );
  }

  protected getValue(): ChronotopesPart {
    let part = this.getEditedPart(CHRONOTOPES_PART_TYPEID) as ChronotopesPart;
    part.chronotopes = copyFormValue(this._draft().chronotopes);
    return part;
  }

  public addChronotope(): void {
    this.editChronotope({}, -1);
  }

  public editChronotope(chronotope: AssertedChronotope, index: number): void {
    this.editedIndex.set(index);
    this.edited.set(structuredClone(chronotope));
  }

  public onChronotopeChange(chronotope: AssertedChronotope): void {
    this.edited.set(chronotope);
  }

  public saveChronotope(): void {
    const chronotopes = [...this.form.chronotopes().value()];
    if (this.editedIndex() === -1) {
      chronotopes.push(this.edited()!);
    } else {
      chronotopes.splice(this.editedIndex(), 1, this.edited()!);
    }
    this.form.chronotopes().value.set(chronotopes);
    this.form.chronotopes().markAsDirty();
    this.closeChronotope();
  }

  public closeChronotope(): void {
    this.edited.set(undefined);
    this.editedIndex.set(-1);
  }

  public deleteChronotope(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete chronotope?')
      .pipe(take(1))
      .subscribe((yes) => {
        if (yes) {
          const entries = [...this.form.chronotopes().value()];
          entries.splice(index, 1);
          this.form.chronotopes().value.set(entries);
          this.form.chronotopes().markAsDirty();
        }
      });
  }

  public moveChronotopeUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entry = this.form.chronotopes().value()[index];
    const entries = [...this.form.chronotopes().value()];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.form.chronotopes().value.set(entries);
    this.form.chronotopes().markAsDirty();
  }

  public moveChronotopeDown(index: number): void {
    if (index + 1 >= this.form.chronotopes().value().length) {
      return;
    }
    const entry = this.form.chronotopes().value()[index];
    const entries = [...this.form.chronotopes().value()];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this.form.chronotopes().value.set(entries);
    this.form.chronotopes().markAsDirty();
  }
}
