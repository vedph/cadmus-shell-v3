import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  EditFragmentFeatureBase,
  FragmentEditorService,
} from '@myrmidon/cadmus-state';
import { LibraryRouteService } from '@myrmidon/cadmus-core';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import { DecoratedTokenTextComponent } from '@myrmidon/cadmus-ui';
import { CommentEditorComponent } from '@myrmidon/cadmus-part-general-ui';

@Component({
  selector: 'cadmus-comment-fragment-feature',
  templateUrl: './comment-fragment-feature.component.html',
  styleUrls: ['./comment-fragment-feature.component.css'],
  imports: [
    CurrentItemBarComponent,
    DecoratedTokenTextComponent,
    CommentEditorComponent,
  ],
})
export class CommentFragmentFeatureComponent
  extends EditFragmentFeatureBase
  implements OnInit
{
  constructor(
    router: Router,
    route: ActivatedRoute,
    snackbar: MatSnackBar,
    editorService: FragmentEditorService,
    libraryRouteService: LibraryRouteService
  ) {
    super(router, route, snackbar, editorService, libraryRouteService);
  }

  protected override getReqThesauriIds(): string[] {
    return [
      'comment-tags',
      'doc-reference-tags',
      'doc-reference-types',
      'comment-categories',
      'comment-keyword-languages',
      'comment-keyword-indexes',
      'comment-keyword-tags',
      'comment-id-scopes',
      'comment-id-tags',
      'assertion-tags',
    ];
  }
}
