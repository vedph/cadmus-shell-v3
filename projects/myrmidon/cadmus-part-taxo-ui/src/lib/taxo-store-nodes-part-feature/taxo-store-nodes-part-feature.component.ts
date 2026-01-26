import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';

import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';

import { TaxoStoreNodesPartComponent } from '../taxo-store-nodes-part/taxo-store-nodes-part.component';

@Component({
  selector: 'cadmus-taxo-store-nodes-part-feature',
  imports: [CurrentItemBarComponent, TaxoStoreNodesPartComponent],
  templateUrl: './taxo-store-nodes-part-feature.component.html',
  styleUrl: './taxo-store-nodes-part-feature.component.css',
})
export class TaxoStoreNodesPartFeatureComponent
  extends EditPartFeatureBase
  implements OnInit
{
  constructor(
    router: Router,
    route: ActivatedRoute,
    snackbar: MatSnackBar,
    itemService: ItemService,
    thesaurusService: ThesaurusService,
    editorService: PartEditorService,
  ) {
    super(
      router,
      route,
      snackbar,
      itemService,
      thesaurusService,
      editorService,
    );
  }

  protected override getReqThesauriIds(): string[] {
    this.roleIdInThesauri = true;
    return [];
  }
}
