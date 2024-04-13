import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import {
  FormGroup,
  FormArray,
  FormBuilder,
  FormControl,
  Validators,
} from '@angular/forms';

import { Part } from '@myrmidon/cadmus-core';
import { ColorService, CustomValidators } from '@myrmidon/cadmus-ui';
import { FacetService } from '@myrmidon/cadmus-api';
import { AppRepository } from '@myrmidon/cadmus-state';
import { DialogService } from '@myrmidon/ng-mat-tools';
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
})
export class PartsScopeEditorComponent implements OnInit {
  private _parts: Part[] | undefined;

  @Input()
  public get parts(): Part[] | undefined {
    return this._parts;
  }
  public set parts(value: Part[] | undefined) {
    this._parts = value;
    this.updateForm();
  }

  @Input()
  public readonly?: boolean;

  @Output()
  public setScopeRequest: EventEmitter<PartScopeSetRequest>;

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
    // events
    this.setScopeRequest = new EventEmitter<PartScopeSetRequest>();
    // form
    this.checks = _formBuilder.array([], CustomValidators.minChecked(1));
    this.scope = _formBuilder.control(null, [
      Validators.maxLength(50),
      Validators.pattern(/^[-a-zA-Z0-9_]+$/),
    ]);
    this.form = _formBuilder.group({
      checks: this.checks,
      scope: this.scope,
    });
  }

  ngOnInit(): void {}

  private updateForm(): void {
    this.checks.clear();
    if (!this._parts || this._parts.length === 0) {
      return;
    }

    for (let i = 0; i < this._parts.length; i++) {
      this.checks.push(this._formBuilder.control(false));
    }
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
    if (this.form.invalid || !this._parts) {
      return;
    }
    const ids: string[] = [];
    for (let i = 0; i < this.checks.length; i++) {
      if (this.checks.controls[i].value === true) {
        ids.push(this._parts[i].id);
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
