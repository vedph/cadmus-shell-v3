import {
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import {
  FormField,
  form,
  maxLength,
  pattern,
  validate,
} from '@angular/forms/signals';
import { DatePipe } from '@angular/common';

import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';

import { ColorService } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';

import { Part } from '@myrmidon/cadmus-core';
import { FacetService } from '@myrmidon/cadmus-api';
import { AppRepository } from '@myrmidon/cadmus-state';

import { EditedItemRepository } from '../state/edited-item.repository';

export interface PartScopeSetRequest {
  ids: string[];
  scope: string;
}

/**
 * The editable shape behind the form: one check per part, and the scope
 * to assign ('' to remove it).
 */
interface PartsScopeControls {
  checks: boolean[];
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
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
export class PartsScopeEditorComponent {
  public readonly parts = input<Part[]>();
  public readonly readonly = input<boolean>();
  public readonly setScopeRequest = output<PartScopeSetRequest>();

  /**
   * One check per part: rebuilt (all unchecked) whenever parts change.
   * The scope is not related to parts, so it survives the rebuild.
   */
  private readonly _draft = linkedSignal<Part[] | undefined, PartsScopeControls>(
    {
      source: () => this.parts(),
      computation: (parts, previous) => ({
        checks: (parts || []).map(() => false),
        scope: previous?.value.scope ?? '',
      }),
    },
  );

  public readonly form = form(this._draft, (path) => {
    // at least 1 part must be checked
    validate(path.checks, ({ value }) =>
      value().some((c) => c) ? null : { kind: 'minChecked' },
    );
    maxLength(path.scope, 50);
    pattern(path.scope, /^[-a-zA-Z0-9_]+$/);
  });

  constructor(
    private _facetService: FacetService,
    private _dialogService: DialogService,
    private _appRepository: AppRepository,
    private _colorService: ColorService,
    private _editedItemRepository: EditedItemRepository,
  ) {
    // ensure app data is loaded
    this._appRepository.load();
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
    if (this.form().invalid() || !this.parts()?.length) {
      return;
    }
    const { checks, scope } = this._draft();
    const ids = this.parts()!
      .filter((_, i) => checks[i])
      .map((p) => p.id);

    let msg = scope
      ? `Assign scope "${scope}" to ${ids.length} part`
      : `Remove scope from ${ids.length} part`;
    msg += ids.length > 1 ? 's?' : '?';

    this._dialogService.confirm('Confirm Scopes', msg).subscribe((result) => {
      if (!result) {
        return;
      }
      this.setScopeRequest.emit({
        ids,
        // no scope is sent as null, as the old form control did
        scope: scope || null!,
      });
    });
  }
}
