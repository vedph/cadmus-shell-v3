import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  EditFragmentFeatureBase,
  FragmentEditorService,
} from '@myrmidon/cadmus-state';
import { LibraryRouteService } from '@myrmidon/cadmus-core';

@Component({
  selector: 'cadmus-comment-fragment-feature',
  templateUrl: './comment-fragment-feature.component.html',
  styleUrls: ['./comment-fragment-feature.component.css'],
  standalone: false,
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
      'languages',
      'keyword-indexes',
      'keyword-tags',
      'comment-id-scopes',
      'comment-id-tags',
      'assertion-tags',
      'pin-link-settings',
    ];
  }
}
