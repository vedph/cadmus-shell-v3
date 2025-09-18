import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';

import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { AssertedHistoricalDatesPartComponent } from '@myrmidon/cadmus-part-general-ui';
import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';

@Component({
  selector: 'cadmus-asserted-historical-date-feature',
  imports: [CurrentItemBarComponent, AssertedHistoricalDatesPartComponent],
  templateUrl: './asserted-historical-date-feature.component.html',
  styleUrl: './asserted-historical-date-feature.component.css',
})
export class AssertedHistoricalDateFeatureComponent
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
      'asserted-historical-dates-tags',
      'assertion-tags',
      'doc-reference-types',
      'doc-reference-tags',
    ];
  }
}
