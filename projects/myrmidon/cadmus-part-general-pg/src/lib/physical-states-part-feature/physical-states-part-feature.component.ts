import { Component, OnInit, ChangeDetectionStrategy, } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';

import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { PhysicalStatesPartComponent } from '@myrmidon/cadmus-part-general-ui';
import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';

@Component({
  selector: 'cadmus-physical-states-part-feature',
  templateUrl: './physical-states-part-feature.component.html',
  styleUrl: './physical-states-part-feature.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrentItemBarComponent, PhysicalStatesPartComponent],
})
export class PhysicalStatesPartFeatureComponent
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
      'physical-states',
      'physical-state-features',
      'physical-state-reporters',
    ];
  }
}
