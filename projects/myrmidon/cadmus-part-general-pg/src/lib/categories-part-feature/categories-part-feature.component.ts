import { Component, OnInit, ChangeDetectionStrategy, } from '@angular/core';
import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { Router, ActivatedRoute } from '@angular/router';

import { MatSnackBar } from '@angular/material/snack-bar';

import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import { CategoriesPartComponent } from '@myrmidon/cadmus-part-general-ui';

@Component({
  selector: 'cadmus-categories-part-feature',
  imports: [CurrentItemBarComponent, CategoriesPartComponent],
  templateUrl: './categories-part-feature.component.html',
  styleUrls: ['./categories-part-feature.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesPartFeatureComponent
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
    return ['categories'];
  }
}
