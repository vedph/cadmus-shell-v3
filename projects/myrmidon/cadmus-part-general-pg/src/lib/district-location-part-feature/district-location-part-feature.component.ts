import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import { DistrictLocationPartComponent } from '@myrmidon/cadmus-part-general-ui';

@Component({
  selector: 'cadmus-district-location-part-feature',
  templateUrl: './district-location-part-feature.component.html',
  styleUrl: './district-location-part-feature.component.scss',
  imports: [CurrentItemBarComponent, DistrictLocationPartComponent],
})
export class DistrictLocationPartFeatureComponent
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
    return ['district-name-piece-types', 'district-name-lang-entries'];
  }
}
