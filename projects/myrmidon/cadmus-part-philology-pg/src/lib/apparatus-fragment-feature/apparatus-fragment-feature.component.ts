import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import {
  EditFragmentFeatureBase,
  FragmentEditorService,
} from '@myrmidon/cadmus-state';
import { LibraryRouteService } from '@myrmidon/cadmus-core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'cadmus-apparatus-fragment-feature',
  templateUrl: './apparatus-fragment-feature.component.html',
  styleUrls: ['./apparatus-fragment-feature.component.css'],
  standalone: false,
})
export class ApparatusFragmentFeatureComponent
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
      '!apparatus-tags',
      '!apparatus-author-tags',
      '!author-works',
      'apparatus-witnesses',
      'apparatus-authors',
    ];
  }
}
