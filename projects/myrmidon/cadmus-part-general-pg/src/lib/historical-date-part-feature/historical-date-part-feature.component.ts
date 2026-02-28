import { Component, OnInit, ChangeDetectionStrategy, } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import { HistoricalDatePartComponent } from '@myrmidon/cadmus-part-general-ui';

@Component({
  selector: 'cadmus-historical-date-part-feature',
  templateUrl: './historical-date-part-feature.component.html',
  styleUrls: ['./historical-date-part-feature.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrentItemBarComponent, HistoricalDatePartComponent],
})
export class HistoricalDatePartFeatureComponent
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
    return ['doc-reference-tags', 'doc-reference-types'];
  }
}
