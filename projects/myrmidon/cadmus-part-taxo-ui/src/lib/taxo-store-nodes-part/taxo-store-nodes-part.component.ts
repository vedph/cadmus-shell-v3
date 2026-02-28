import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormBuilder,
  FormGroup,
  UntypedFormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';

import { MatBadge } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { EditedObject } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
} from '@myrmidon/cadmus-ui';
import { StringPair } from '@myrmidon/cadmus-api';
import { TaxoStoreNode } from '@myrmidon/taxo-store-api';
import { TaxoStorePicker } from '@myrmidon/taxo-store-picker';

import {
  TAXO_STORE_NODES_PART_TYPEID,
  TaxoStoreNodesPart,
} from '../taxo-store-nodes-part';

/**
 * The settings for the TaxoStoreNodesPart editor.
 */
interface TaxoStoreNodesPartSettings {
  treeId: string;
  hasTopNodeFilter?: boolean;
  hasFlagsFilter?: boolean;
  availableFlags?: { id: string; name: string }[];
  canEdit?: boolean;
  canAdd?: boolean;
  canDelete?: boolean;
}

/**
 * The default settings for the TaxoStoreNodesPart editor.
 */
const DEFAULT_SETTINGS: TaxoStoreNodesPartSettings = {
  treeId: '',
  hasTopNodeFilter: true,
  canEdit: true,
  canAdd: true,
  canDelete: true,
};

/**
 * TaxoStoreNodesPart editor component.
 * This has no thesauri, but requires the taxonomy tree ID to be set in settings,
 * either globally or per role.
 */
@Component({
  selector: 'cadmus-taxo-store-nodes-part',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatBadge,
    MatButtonModule,
    MatCardModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    CloseSaveButtonsComponent,
    TaxoStorePicker,
  ],
  templateUrl: './taxo-store-nodes-part.component.html',
  styleUrl: './taxo-store-nodes-part.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaxoStoreNodesPartComponent
  extends ModelEditorComponentBase<TaxoStoreNodesPart>
  implements OnInit
{
  public nodeIds: FormControl<StringPair[]>;

  /**
   * The ID of the taxonomy tree to use. This is specified in settings, possibly with
   * multiple entries for different roles.
   */
  public readonly treeId = signal<string>('');

  public readonly hasTopNodeFilter = signal<boolean>(false);
  public readonly hasFlagsFilter = signal<boolean>(false);
  public readonly availableFlags = signal<{ id: string; name: string }[]>([]);
  public readonly canEdit = signal<boolean>(true);
  public readonly canAdd = signal<boolean>(true);
  public readonly canDelete = signal<boolean>(true);

  constructor(authService: AuthJwtService, formBuilder: FormBuilder) {
    super(authService, formBuilder);

    // form
    this.nodeIds = formBuilder.control([], { nonNullable: true });

    // settings: try role-specific first, fall back to global
    this.initSettings<TaxoStoreNodesPartSettings>(
      TAXO_STORE_NODES_PART_TYPEID,
      (settings) => {
        if (settings) {
          this.applySettings(settings);
        } else {
          // role-specific not found, fall back to global settings
          this._appRepository
            ?.getSettingFor<TaxoStoreNodesPartSettings>(
              TAXO_STORE_NODES_PART_TYPEID,
            )
            .then((global) => this.applySettings(global || DEFAULT_SETTINGS));
        }
      },
    );
  }

  private applySettings(settings: TaxoStoreNodesPartSettings): void {
    this.treeId.set(settings.treeId);
    this.hasTopNodeFilter.set(!!settings.hasTopNodeFilter);
    this.hasFlagsFilter.set(!!settings.hasFlagsFilter);
    this.availableFlags.set(settings.availableFlags || []);
    this.canEdit.set(settings.canEdit !== false);
    this.canAdd.set(settings.canAdd !== false);
    this.canDelete.set(settings.canDelete !== false);
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      nodeIds: this.nodeIds,
    });
  }

  private updateForm(part?: TaxoStoreNodesPart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    this.nodeIds.setValue(part.nodeIds || []);
    this.form.markAsPristine();
  }

  protected override onDataSet(data?: EditedObject<TaxoStoreNodesPart>): void {
    // form
    this.updateForm(data?.value);
  }

  protected getValue(): TaxoStoreNodesPart {
    let part = this.getEditedPart(
      TAXO_STORE_NODES_PART_TYPEID,
    ) as TaxoStoreNodesPart;
    part.nodeIds = [...this.nodeIds.value];
    return part;
  }

  public removeNode(index: number): void {
    const nodes = [...this.nodeIds.value];
    nodes.splice(index, 1);
    this.nodeIds.setValue(nodes);
    this.nodeIds.markAsDirty();
    this.nodeIds.updateValueAndValidity();
  }

  public addNode(node: TaxoStoreNode): void {
    const nodes = [...this.nodeIds.value];
    const newNode: StringPair = { value: node.key, name: node.label };

    // if a node with the same key exists:
    // - if label is equal, do nothing;
    // - if label is different, update label
    const i = nodes.findIndex((n) => n.value === node.key);
    if (i !== -1) {
      if (nodes[i].name !== node.label) {
        nodes[i] = newNode;
        this.nodeIds.setValue(nodes);
        this.nodeIds.markAsDirty();
        this.nodeIds.updateValueAndValidity();
      }
      return;
    }

    // add new node and sort by label
    nodes.push(newNode);
    nodes.sort((a, b) => a.name.localeCompare(b.name));

    this.nodeIds.setValue(nodes);
    this.nodeIds.markAsDirty();
    this.nodeIds.updateValueAndValidity();
  }
}
