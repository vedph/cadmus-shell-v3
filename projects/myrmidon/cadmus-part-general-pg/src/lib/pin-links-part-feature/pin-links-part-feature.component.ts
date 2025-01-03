import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import { PinLinksPartComponent } from '@myrmidon/cadmus-part-general-ui';

@Component({
  selector: 'cadmus-pin-links-part-feature',
  templateUrl: './pin-links-part-feature.component.html',
  styleUrls: ['./pin-links-part-feature.component.css'],
  imports: [CurrentItemBarComponent, PinLinksPartComponent],
})
export class PinLinksPartFeatureComponent
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
  }

  protected override getReqThesauriIds(): string[] {
    return [
      'pin-link-scopes',
      'pin-link-tags',
      'pin-link-assertion-tags',
      'pin-link-docref-types',
      'pin-link-docref-tags',
      'pin-link-settings',
    ];
  }
}
