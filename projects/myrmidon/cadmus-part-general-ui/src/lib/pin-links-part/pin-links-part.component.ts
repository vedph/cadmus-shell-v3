import { Component, OnInit, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import {
  FormControl,
  FormBuilder,
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

import { PinLinksPart, PIN_LINKS_PART_TYPEID } from '../pin-links-part';
import { LookupProviderOptions } from '@myrmidon/cadmus-refs-lookup';

interface PinLinksPartSettings {
  lookupProviderOptions?: LookupProviderOptions;
}

/**
 * PinLinksPart editor component.
 * Thesauri: pin-link-scopes, pin-link-tags, pin-link-assertion-tags,
 * pin-link-docref-types, pin-link-docref-tags, asserted-id-features.
 * Settings: lookupProviderOptions (LookupProviderOptions).
 */
@Component({
  selector: 'cadmus-pin-links-part',
  templateUrl: './pin-links-part.component.html',
  styleUrls: ['./pin-links-part.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardContent,
    TitleCasePipe,
    AssertedCompositeIdsComponent,
    MatCardActions,
    CloseSaveButtonsComponent,
  ],
})
export class PinLinksPartComponent
  extends ModelEditorComponentBase<PinLinksPart>
  implements OnInit
{
  public links: FormControl<AssertedCompositeId[]>;

  // pin-link-scopes
  public readonly idScopeEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  // pin-link-tags
  public readonly idTagEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  // pin-link-assertion-tags
  public readonly assTagEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  // pin-link-docref-types
  public readonly refTypeEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  // pin-link-docref-tags
  public readonly refTagEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  // asserted-id-features
  public readonly featureEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );

  // lookup options depending on role
  public readonly lookupProviderOptions = signal<
    LookupProviderOptions | undefined
  >(undefined);

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

  private updateThesauri(thesauri: ThesauriSet): void {
    let key = 'pin-link-scopes';
    if (this.hasThesaurus(key)) {
      this.idScopeEntries.set(thesauri[key].entries);
    } else {
      this.idScopeEntries.set(undefined);
    }
    key = 'pin-link-tags';
    if (this.hasThesaurus(key)) {
      this.idTagEntries.set(thesauri[key].entries);
    } else {
      this.idTagEntries.set(undefined);
    }
    key = 'pin-link-assertion-tags';
    if (this.hasThesaurus(key)) {
      this.assTagEntries.set(thesauri[key].entries);
    } else {
      this.assTagEntries.set(undefined);
    }
    key = 'pin-link-docref-types';
    if (this.hasThesaurus(key)) {
      this.refTypeEntries.set(thesauri[key].entries);
    } else {
      this.refTypeEntries.set(undefined);
    }
    key = 'pin-link-docref-tags';
    if (this.hasThesaurus(key)) {
      this.refTagEntries.set(thesauri[key].entries);
    } else {
      this.refTagEntries.set(undefined);
    }
    key = 'asserted-id-features';
    if (this.hasThesaurus(key)) {
      this.featureEntries.set(thesauri[key].entries);
    } else {
      this.featureEntries.set(undefined);
    }
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
    }
    // settings
    this._appRepository
      ?.getSettingFor<PinLinksPartSettings>(
        PIN_LINKS_PART_TYPEID,
        this.identity()?.roleId || undefined,
      )
      .then((settings) => {
        const options = settings?.lookupProviderOptions;
        this.lookupProviderOptions.set(options || undefined);
      });
    // form
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
