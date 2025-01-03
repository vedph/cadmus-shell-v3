import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import {
  EditFragmentFeatureBase,
  FragmentEditorService,
} from '@myrmidon/cadmus-state';
import { LibraryRouteService } from '@myrmidon/cadmus-core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import { DecoratedTokenTextComponent } from '@myrmidon/cadmus-ui';
import { ApparatusFragmentComponent } from '@myrmidon/cadmus-part-philology-ui';

@Component({
  selector: 'cadmus-apparatus-fragment-feature',
  imports: [
    CurrentItemBarComponent,
    DecoratedTokenTextComponent,
    ApparatusFragmentComponent,
  ],
  templateUrl: './apparatus-fragment-feature.component.html',
  styleUrls: ['./apparatus-fragment-feature.component.css'],
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
