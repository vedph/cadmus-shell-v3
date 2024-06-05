import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';

import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'cadmus-refs-external-ids-part-feature',
  templateUrl: './external-ids-part-feature.component.html',
  styleUrls: ['./external-ids-part-feature.component.css'],
})
export class ExternalIdsPartFeatureComponent
  extends EditPartFeatureBase
  implements OnInit
{
  constructor(
    router: Router,
    route: ActivatedRoute,
    snackbar: MatSnackBar,
    itemService: ItemService,
    thesaurusService: ThesaurusService,
    editorService: PartEditorService
  ) {
    super(
      router,
      route,
      snackbar,
      itemService,
      thesaurusService,
      editorService
    );
    this.roleIdInThesauri = true;
  }

  protected override getReqThesauriIds(): string[] {
    return [
      'external-id-scopes',
      'external-id-tags',
      'assertion-tags',
      'doc-reference-types',
      'doc-reference-tags',
    ];
  }
}
