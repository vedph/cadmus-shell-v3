import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';

@Component({
  selector: 'cadmus-historical-events-part-feature',
  templateUrl: './historical-events-part-feature.component.html',
  styleUrls: ['./historical-events-part-feature.component.css'],
  standalone: false,
})
export class HistoricalEventsPartFeatureComponent
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
      'event-types',
      'event-tags',
      'event-relations',
      'chronotope-tags',
      'assertion-tags',
      'doc-reference-tags',
      'doc-reference-types',
      'pin-link-scopes',
      'pin-link-tags',
      'pin-link-settings',
    ];
  }
}
