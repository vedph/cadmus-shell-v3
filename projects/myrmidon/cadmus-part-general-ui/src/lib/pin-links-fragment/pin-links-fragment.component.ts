import { Component, OnInit } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import {
  FormBuilder,
  FormControl,
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
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';

import { NgxToolsValidators } from '@myrmidon/ngx-tools';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import {
  AssertedCompositeId,
  AssertedCompositeIdsComponent,
} from '@myrmidon/cadmus-refs-asserted-ids';

import {
  ThesauriSet,
  ThesaurusEntry,
  EditedObject,
} from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
} from '@myrmidon/cadmus-ui';

import { PinLinksFragment } from '../pin-links-fragment';

/**
 * Pin-based links fragment editor component.
 * Thesauri: pin-link-scopes, pin-link-tags, pin-link-assertion-tags,
 * pin-link-docref-types, pin-link-docref-tags, pin-link-settings.
 */
@Component({
  selector: 'cadmus-pin-links-fragment',
  templateUrl: './pin-links-fragment.component.html',
  styleUrls: ['./pin-links-fragment.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardContent,
    AssertedCompositeIdsComponent,
    MatCardActions,
    TitleCasePipe,
    CloseSaveButtonsComponent,
  ],
})
export class PinLinksFragmentComponent
  extends ModelEditorComponentBase<PinLinksFragment>
  implements OnInit
{
  public links: FormControl<AssertedCompositeId[]>;

  // settings
  // by-type: true/false
  public pinByTypeMode?: boolean;
  // switch-mode: true/false
  public canSwitchMode?: boolean;
  // edit-target: true/false
  public canEditTarget?: boolean;

  // pin-link-scopes
  public idScopeEntries?: ThesaurusEntry[];
  // pin-link-tags
  public idTagEntries?: ThesaurusEntry[];
  // pin-link-assertion-tags
  public assTagEntries?: ThesaurusEntry[];
  // pin-link-docref-types
  public refTypeEntries?: ThesaurusEntry[];
  // pin-link-docref-tags
  public refTagEntries?: ThesaurusEntry[];
  // pin-link-settings; these include:
  // - by-type: true/false
  // - switch-mode: true/false
  // - edit-target: true/false
  public setTagEntries?: ThesaurusEntry[];

  constructor(authService: AuthJwtService, formBuilder: FormBuilder) {
    super(authService, formBuilder);
    // form
    this.links = formBuilder.control([], {
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
      links: this.links,
    });
  }

  /**
   * Load settings from thesaurus entries.
   *
   * @param entries The thesaurus entries if any.
   */
  private loadSettings(entries?: ThesaurusEntry[]): void {
    if (!entries?.length) {
      this.pinByTypeMode = undefined;
      this.canSwitchMode = undefined;
      this.canEditTarget = undefined;
    }
    this.pinByTypeMode =
      entries?.find((e) => e.id === 'by-type')?.value === 'true';
    this.canSwitchMode =
      entries?.find((e) => e.id === 'switch-mode')?.value === 'true';
    this.canEditTarget =
      entries?.find((e) => e.id === 'edit-target')?.value === 'true';
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    let key = 'pin-link-scopes';
    if (this.hasThesaurus(key)) {
      this.idScopeEntries = thesauri[key].entries;
    } else {
      this.idScopeEntries = undefined;
    }
    key = 'pin-link-tags';
    if (this.hasThesaurus(key)) {
      this.idTagEntries = thesauri[key].entries;
    } else {
      this.idTagEntries = undefined;
    }
    key = 'pin-link-assertion-tags';
    if (this.hasThesaurus(key)) {
      this.assTagEntries = thesauri[key].entries;
    } else {
      this.assTagEntries = undefined;
    }
    key = 'pin-link-docref-types';
    if (this.hasThesaurus(key)) {
      this.refTypeEntries = thesauri[key].entries;
    } else {
      this.refTypeEntries = undefined;
    }
    key = 'pin-link-docref-tags';
    if (this.hasThesaurus(key)) {
      this.refTagEntries = thesauri[key].entries;
    } else {
      this.refTagEntries = undefined;
    }
    // load settings from thesaurus
    this.loadSettings(thesauri['pin-link-settings']?.entries);
  }

  private updateForm(fr?: PinLinksFragment | null): void {
    if (!fr) {
      this.form.reset();
      return;
    }
    this.links.setValue(fr.links || []);
    this.form.markAsPristine();
  }

  protected override onDataSet(data?: EditedObject<PinLinksFragment>): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  protected getValue(): PinLinksFragment {
    const fr = this.getEditedFragment() as PinLinksFragment;
    fr.links = this.links.value || [];
    return fr;
  }

  public onIdsChange(ids: AssertedCompositeId[]): void {
    this.links.setValue(ids);
    this.links.updateValueAndValidity();
    this.links.markAsDirty();
  }
}
