import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import { DocReferencesPartComponent } from '@myrmidon/cadmus-part-general-ui';

@Component({
  selector: 'cadmus-doc-references-part-feature',
  templateUrl: './doc-references-part-feature.component.html',
  styleUrls: ['./doc-references-part-feature.component.css'],
  imports: [CurrentItemBarComponent, DocReferencesPartComponent],
})
export class DocReferencesPartFeatureComponent
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
