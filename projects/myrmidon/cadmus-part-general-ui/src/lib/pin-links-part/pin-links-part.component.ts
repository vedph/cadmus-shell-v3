import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  FormBuilder,
  FormGroup,
  UntypedFormGroup,
} from '@angular/forms';

import { NgToolsValidators } from '@myrmidon/ng-tools';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { EditedObject, ModelEditorComponentBase } from '@myrmidon/cadmus-ui';
import { AssertedCompositeId } from '@myrmidon/cadmus-refs-asserted-ids';

import { ThesauriSet, ThesaurusEntry } from '@myrmidon/cadmus-core';

import { PinLinksPart, PIN_LINKS_PART_TYPEID } from '../pin-links-part';

/**
 * PinLinksPart editor component.
 * Thesauri: pin-link-scopes, pin-link-tags, pin-link-assertion-tags,
 * pin-link-docref-types, pin-link-docref-tags, pin-link-settings.
 */
@Component({
  selector: 'cadmus-pin-links-part',
  templateUrl: './pin-links-part.component.html',
  styleUrls: ['./pin-links-part.component.css'],
  standalone: false,
})
export class PinLinksPartComponent
  extends ModelEditorComponentBase<PinLinksPart>
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
      validators: NgToolsValidators.strictMinLengthValidator(1),
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

  private updateForm(part?: PinLinksPart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    this.links.setValue(part.links || []);
    this.form.markAsPristine();
  }

  protected override onDataSet(data?: EditedObject<PinLinksPart>): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    } // form
    this.updateForm(data?.value);
  }

  protected getValue(): PinLinksPart {
    let part = this.getEditedPart(PIN_LINKS_PART_TYPEID) as PinLinksPart;
    part.links = this.links.value || [];
    return part;
  }

  public onIdsChange(ids: AssertedCompositeId[]): void {
    this.links.setValue(ids);
    this.links.updateValueAndValidity();
    this.links.markAsDirty();
  }
}
