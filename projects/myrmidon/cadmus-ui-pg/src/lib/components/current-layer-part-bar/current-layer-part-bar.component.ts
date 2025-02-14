import { Component, OnDestroy, OnInit } from '@angular/core';

import { TextLayerPart } from '@myrmidon/cadmus-core';
import { FacetService } from '@myrmidon/cadmus-api';
import { AppRepository, EditedLayerRepository } from '@myrmidon/cadmus-state';
import { EditedItemRepository } from '@myrmidon/cadmus-item-editor';
import { Subscription } from 'rxjs';

@Component({
  selector: 'cadmus-current-layer-part-bar',
  templateUrl: './current-layer-part-bar.component.html',
  styleUrls: ['./current-layer-part-bar.component.css'],
})
export class CurrentLayerPartBarComponent implements OnInit, OnDestroy {
  private _subs: Subscription[] = [];

  constructor(
    private _appRepository: AppRepository,
    private _editedItemRepository: EditedItemRepository,
    private _editedLayerRepository: EditedLayerRepository,
    private _facetService: FacetService
  ) {}

  public typeId?: string;
  public roleId?: string;
  public color?: string;

  private getTypeIdName(typeId: string): string {
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

  private getRoleIdName(roleId?: string): string | undefined {
    if (!roleId || !roleId.startsWith('fr.')) {
      return roleId;
    }
    return this.getTypeIdName(roleId);
  }

  private getPartColor(typeId: string, roleId?: string): string {
    const facet = this._editedItemRepository.getFacet();
    return this._facetService.getPartColor(typeId, roleId, facet);
  }

  private updateLabels(): void {
    const part: TextLayerPart | undefined =
      this._editedLayerRepository.getPart();
    if (!part) {
      this.typeId = undefined;
      this.roleId = undefined;
      this.color = undefined;
      return;
    } else {
      this.typeId = this.getTypeIdName(part.typeId);
      this.roleId = this.getRoleIdName(part.roleId);
      this.color = this.getPartColor(part.typeId, part.roleId);
    }
  }

  public ngOnInit(): void {
    this._subs.push(
      this._editedItemRepository.facet$.subscribe((_) => {
        this.updateLabels();
      })
    );
    this._subs.push(
      this._editedLayerRepository.part$.subscribe((_) => {
        this.updateLabels();
      })
    );
    // ensure app data is loaded
    this._appRepository.load();
  }

  public ngOnDestroy(): void {
    this._subs.forEach((s) => s.unsubscribe());
  }
}
