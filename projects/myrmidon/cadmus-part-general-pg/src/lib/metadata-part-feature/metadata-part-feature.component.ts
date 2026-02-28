import { Component, OnInit, ChangeDetectionStrategy, } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import { MetadataPartComponent } from '@myrmidon/cadmus-part-general-ui';

@Component({
  selector: 'cadmus-metadata-part-feature',
  templateUrl: './metadata-part-feature.component.html',
  styleUrls: ['./metadata-part-feature.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrentItemBarComponent, MetadataPartComponent],
})
export class MetadataPartFeatureComponent
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
    return ['metadata-types', 'metadata-names'];
  }
}
