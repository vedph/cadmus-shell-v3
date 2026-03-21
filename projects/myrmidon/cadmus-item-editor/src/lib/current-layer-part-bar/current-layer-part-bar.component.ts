import {
  Component,
  computed,
  ChangeDetectionStrategy,
  Signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { FacetDefinition, TextLayerPart } from '@myrmidon/cadmus-core';
import { FacetService } from '@myrmidon/cadmus-api';
import { AppRepository, EditedLayerRepository } from '@myrmidon/cadmus-state';

import { EditedItemRepository } from '../state/edited-item.repository';

@Component({
  selector: 'cadmus-current-layer-part-bar',
  templateUrl: './current-layer-part-bar.component.html',
  styleUrls: ['./current-layer-part-bar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrentLayerPartBarComponent {
  private readonly _facet: Signal<FacetDefinition | undefined>;
  private readonly _part: Signal<TextLayerPart | undefined>;

  public readonly typeId: Signal<string | undefined>;
  public readonly roleId: Signal<string | undefined>;
  public readonly color: Signal<string | undefined>;

  constructor(
    private _appRepository: AppRepository,
    private _editedItemRepository: EditedItemRepository,
    editedLayerRepository: EditedLayerRepository,
    private _facetService: FacetService,
  ) {
    this._facet = toSignal(this._editedItemRepository.facet$);
    this._part = toSignal(editedLayerRepository.part$);

    this.typeId = computed(() => {
      const part = this._part();
      if (!part) return undefined;
      return this.getTypeIdName(part.typeId);
    });

    this.roleId = computed(() => {
      const part = this._part();
      if (!part) return undefined;
      return this.getRoleIdName(part.roleId);
    });

    this.color = computed(() => {
      const part = this._part();
      this._facet(); // declare dependency so color recomputes on facet change
      if (!part) return undefined;
      return this.getPartColor(part.typeId, part.roleId);
    });
  }

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
}
