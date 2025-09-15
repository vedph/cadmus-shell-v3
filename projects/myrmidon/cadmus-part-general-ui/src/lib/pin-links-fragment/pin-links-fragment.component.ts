import { Component, OnInit, signal } from '@angular/core';
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
 * pin-link-docref-types, pin-link-docref-tags.
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
  public readonly pinByTypeMode = signal<boolean>(true);
  // switch-mode: true/false
  public readonly canSwitchMode = signal<boolean>(true);
  // edit-target: true/false
  public readonly canEditTarget = signal<boolean>(true);

  // pin-link-scopes
  public readonly idScopeEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // pin-link-tags
  public readonly idTagEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // pin-link-assertion-tags
  public readonly assTagEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // pin-link-docref-types
  public readonly refTypeEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // pin-link-docref-tags
  public readonly refTagEntries = signal<ThesaurusEntry[] | undefined>(undefined);

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
