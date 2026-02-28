import { Component, OnInit, ChangeDetectionStrategy, } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import { TiledTextPartComponent } from '@myrmidon/cadmus-part-general-ui';

@Component({
  selector: 'cadmus-tiled-text-part-feature',
  templateUrl: './tiled-text-part-feature.component.html',
  styleUrls: ['./tiled-text-part-feature.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrentItemBarComponent, TiledTextPartComponent],
})
export class TiledTextPartFeatureComponent
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
}
