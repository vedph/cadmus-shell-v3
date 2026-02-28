import { Component, OnInit, ChangeDetectionStrategy, } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';

import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';

import { FlagsPartComponent } from '@myrmidon/cadmus-part-general-ui';

@Component({
  selector: 'cadmus-flags-part-feature',
  imports: [CurrentItemBarComponent, FlagsPartComponent],
  templateUrl: './flags-part-feature.component.html',
  styleUrl: './flags-part-feature.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlagsPartFeatureComponent
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
    return ['flags'];
  }
}
