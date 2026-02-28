import { Component, OnInit, ChangeDetectionStrategy, } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import { IndexKeywordsPartComponent } from '@myrmidon/cadmus-part-general-ui';

@Component({
  selector: 'cadmus-index-keywords-part-feature',
  templateUrl: './index-keywords-part-feature.component.html',
  styleUrls: ['./index-keywords-part-feature.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrentItemBarComponent, IndexKeywordsPartComponent],
})
export class IndexKeywordsPartFeatureComponent
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
    return ['languages', 'keyword-indexes', 'keyword-tags'];
  }
}
