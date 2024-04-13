import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';

@Component({
  selector: 'cadmus-comment-part-feature',
  templateUrl: './comment-part-feature.component.html',
  styleUrls: ['./comment-part-feature.component.css'],
})
export class CommentPartFeatureComponent
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
      'comment-tags',
      'doc-reference-tags',
      'doc-reference-types',
      'comment-categories',
      'languages',
      'keyword-indexes',
      'keyword-tags',
      'comment-id-scopes',
      'comment-id-tags',
      'assertion-tags',
      'pin-link-settings'
    ];
  }
}
