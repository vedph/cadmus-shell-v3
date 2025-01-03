import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import { ChronotopesPartComponent } from '@myrmidon/cadmus-part-general-ui';

@Component({
  selector: 'cadmus-chronotopes-part-feature',
  templateUrl: './chronotopes-part-feature.component.html',
  styleUrls: ['./chronotopes-part-feature.component.css'],
  imports: [CurrentItemBarComponent, ChronotopesPartComponent],
})
export class ChronotopesPartFeatureComponent
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
      'chronotope-place-tags',
      'chronotope-assertion-tags',
      'doc-reference-types',
      'doc-reference-tags',
    ];
  }
}
