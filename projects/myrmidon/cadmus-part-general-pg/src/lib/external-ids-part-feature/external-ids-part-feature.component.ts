import { Component, OnInit, ChangeDetectionStrategy, } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';

import { MatSnackBar } from '@angular/material/snack-bar';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import { ExternalIdsPartComponent } from '@myrmidon/cadmus-part-general-ui';

@Component({
  selector: 'cadmus-refs-external-ids-part-feature',
  templateUrl: './external-ids-part-feature.component.html',
  styleUrls: ['./external-ids-part-feature.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrentItemBarComponent, ExternalIdsPartComponent],
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
