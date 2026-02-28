import { Component, OnInit, ChangeDetectionStrategy, } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  EditFragmentFeatureBase,
  FragmentEditorService,
} from '@myrmidon/cadmus-state';
import { LibraryRouteService } from '@myrmidon/cadmus-core';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import { DecoratedTokenTextComponent } from '@myrmidon/cadmus-ui';
import { ChronologyFragmentComponent } from '@myrmidon/cadmus-part-general-ui';

@Component({
  selector: 'cadmus-chronology-fragment-feature',
  imports: [
    CurrentItemBarComponent,
    DecoratedTokenTextComponent,
    ChronologyFragmentComponent,
  ],
  templateUrl: './chronology-fragment-feature.component.html',
  styleUrls: ['./chronology-fragment-feature.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChronologyFragmentFeatureComponent
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
    return ['chronology-tags'];
  }
}
