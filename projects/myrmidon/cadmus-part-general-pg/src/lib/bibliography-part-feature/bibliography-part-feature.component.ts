import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import { BibliographyPartComponent } from '@myrmidon/cadmus-part-general-ui';

@Component({
  selector: 'cadmus-bibliography-part-feature',
  imports: [CurrentItemBarComponent, BibliographyPartComponent],
  templateUrl: './bibliography-part-feature.component.html',
  styleUrls: ['./bibliography-part-feature.component.css'],
})
export class BibliographyPartFeatureComponent
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
      'bibliography-languages',
      'bibliography-types',
      'bibliography-tags',
      'bibliography-author-roles',
    ];
  }
}
