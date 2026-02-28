import { Component, OnInit, ChangeDetectionStrategy, } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  EditFragmentFeatureBase,
  FragmentEditorService,
} from '@myrmidon/cadmus-state';
import { LibraryRouteService } from '@myrmidon/cadmus-core';
import { DecoratedTokenTextComponent } from '@myrmidon/cadmus-ui';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import { WitnessesFragmentComponent } from '@myrmidon/cadmus-part-philology-ui';

@Component({
  selector: 'cadmus-witnesses-fragment-feature',
  templateUrl: './witnesses-fragment-feature.component.html',
  styleUrls: ['./witnesses-fragment-feature.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrentItemBarComponent,
    DecoratedTokenTextComponent,
    WitnessesFragmentComponent,
  ],
})
export class WitnessesFragmentFeatureComponent
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
}
