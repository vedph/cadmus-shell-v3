import { Component, OnInit, ChangeDetectionStrategy, } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import { DecoratedCountsPartComponent } from '@myrmidon/cadmus-part-general-ui';

@Component({
  selector: 'cadmus-decorated-counts-part-feature',
  templateUrl: './decorated-counts-part-feature.component.html',
  styleUrl: './decorated-counts-part-feature.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrentItemBarComponent, DecoratedCountsPartComponent],
})
export class DecoratedCountsPartFeatureComponent
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
    return ['decorated-count-ids', 'decorated-count-tags'];
  }
}
