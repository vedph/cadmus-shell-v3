import { Component, input, output, effect, OnDestroy } from '@angular/core';
import {
  FormGroup,
  FormArray,
  FormBuilder,
  FormControl,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';

import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';

import { DialogService } from '@myrmidon/ngx-mat-tools';

import { Part } from '@myrmidon/cadmus-core';
import { ColorService, CustomValidators } from '@myrmidon/cadmus-ui';
import { FacetService } from '@myrmidon/cadmus-api';
import { AppRepository } from '@myrmidon/cadmus-state';

import { EditedItemRepository } from '../state/edited-item.repository';

export interface PartScopeSetRequest {
  ids: string[];
  scope: string;
}

/**
 * Parts thesaurus scope dumb editor component.
 * This is used to set the thesaurus scope of multiple item's parts at once
 * in the item editor.
 */
@Component({
  selector: 'cadmus-parts-scope-editor',
  templateUrl: './parts-scope-editor.component.html',
  styleUrls: ['./parts-scope-editor.component.css'],
  imports: [
    ReactiveFormsModule,
    MatCheckbox,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatButton,
    MatTooltip,
    DatePipe,
  ],
})
export class PartsScopeEditorComponent implements OnDestroy {
  private readonly _sub: Subscription;

  public readonly parts = input<Part[]>();

  public readonly readonly = input<boolean>();

  public readonly setScopeRequest = output<PartScopeSetRequest>();

  public checks: FormArray;
  public scope: FormControl<string | null>;
  public form: FormGroup;

  constructor(
    private _formBuilder: FormBuilder,
    private _facetService: FacetService,
    private _dialogService: DialogService,
    private _appRepository: AppRepository,
    private _colorService: ColorService,
    private _editedItemRepository: EditedItemRepository
  ) {
    this.checks = _formBuilder.array([], CustomValidators.minChecked(1));
    this._sub = this.checks.valueChanges.subscribe(() => {
      this.form.updateValueAndValidity();
    });

    this.scope = _formBuilder.control(null, [
      Validators.maxLength(50),
      Validators.pattern(/^[-a-zA-Z0-9_]+$/),
    ]);
    this.form = _formBuilder.group({
      checks: this.checks,
      scope: this.scope,
    });
    // ensure app data is loaded
    this._appRepository.load();

    effect(() => {
      this.updateForm(this.parts());
    });
  }

  public ngOnDestroy(): void {
    this._sub.unsubscribe();
  }

  private updateForm(parts?: Part[]): void {
    this.checks.clear();
    if (!parts?.length) {
      return;
    }

    for (let i = 0; i < parts.length; i++) {
      this.checks.push(this._formBuilder.control(false));
    }

    this.form.updateValueAndValidity();
  }

  public onCheckChanged(): void {
    this.form.updateValueAndValidity();
  }

  public getPartColor(typeId: string, roleId?: string): string {
    const facet = this._editedItemRepository.getFacet();
    return this._facetService.getPartColor(typeId, roleId, facet);
  }

  public getContrastColor(typeId: string, roleId?: string): string {
    const rgb = this.getPartColor(typeId, roleId);
    return this._colorService.getContrastColor(rgb);
  }

  public getTypeIdName(typeId: string): string {
    const typeThesaurus = this._appRepository.getTypeThesaurus();
    if (!typeThesaurus) {
      return typeId;
    }
    // strip :suffix if any
    const i = typeId.lastIndexOf(':');
    if (i > -1) {
      typeId = typeId.substring(0, i);
    }
    const entry = typeThesaurus.entries?.find((e) => e.id === typeId);
    return entry ? entry.value : typeId;
  }

  public getRoleIdName(roleId: string): string {
    if (!roleId || !roleId.startsWith('fr.')) {
      return roleId;
    }
    return this.getTypeIdName(roleId);
  }

  public submit(): void {
    if (this.form.invalid || !this.parts()?.length) {
      return;
    }
    const ids: string[] = [];
    const parts = this.parts()!;
    for (let i = 0; i < this.checks.length; i++) {
      if (this.checks.controls[i].value === true) {
        ids.push(parts[i].id);
      }
    }

    let msg = this.scope.value
      ? `Assign scope "${this.scope.value}" to ${ids.length} part`
      : `Remove scope from ${ids.length} part`;
    msg += ids.length > 1 ? 's?' : '?';

    this._dialogService.confirm('Confirm Scopes', msg).subscribe((result) => {
      if (!result) {
        return;
      }
      this.setScopeRequest.emit({
        ids,
        scope: this.scope.value!,
      });
    });
  }
}
