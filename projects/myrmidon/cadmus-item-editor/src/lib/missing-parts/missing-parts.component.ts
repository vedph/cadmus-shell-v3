import { Component, output, input, effect, signal } from '@angular/core';

import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';

import {
  PartDefinition,
  Part,
  Thesaurus,
  FacetDefinition,
} from '@myrmidon/cadmus-core';
import { PartBadgeComponent } from '@myrmidon/cadmus-ui';

@Component({
  selector: 'cadmus-missing-parts',
  templateUrl: './missing-parts.component.html',
  styleUrls: ['./missing-parts.component.css'],
  imports: [MatIcon, MatIconButton, MatTooltip, PartBadgeComponent],
})
export class MissingPartsComponent {
  public readonly facetDefinition = input<FacetDefinition>();
  public readonly partDefinitions = input<PartDefinition[]>();
  public readonly parts = input<Part[]>();

  public readonly missingDefinitions = signal<PartDefinition[]>([]);

  /**
   * The types thesaurus.
   */
  public readonly typeThesaurus = input<Thesaurus>();

  /**
   * Emitted when the user requests to add a missing part.
   */
  public readonly addRequest = output<PartDefinition>();

  constructor() {
    effect(() => {
      this.updateMissing(this.partDefinitions(), this.parts());
    });
  }

  private partExists(typeId: string, roleId?: string, parts?: Part[]): boolean {
    if (!parts) {
      return false;
    }
    return parts.some(
      (p) =>
        p.typeId === typeId && ((!p.roleId && !roleId) || p.roleId === roleId)
    );
  }

  private updateMissing(definitions?: PartDefinition[], parts?: Part[]): void {
    const missingDefinitions = [];
    if (!definitions) {
      return;
    }

    for (let i = 0; i < definitions.length; i++) {
      const def = definitions[i];
      if (def.isRequired && !this.partExists(def.typeId, def.roleId, parts)) {
        missingDefinitions.push(def);
      }
    }
    this.missingDefinitions.set(missingDefinitions);
  }

  public requestAddPart(definition: PartDefinition): void {
    this.addRequest.emit(definition);
  }
}
