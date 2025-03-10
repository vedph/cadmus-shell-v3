import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { LibraryRouteService } from '@myrmidon/cadmus-core';
import {
  EditFragmentFeatureBase,
  FragmentEditorService,
} from '@myrmidon/cadmus-state';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import { PinLinksFragmentComponent } from '@myrmidon/cadmus-part-general-ui';
import { DecoratedTokenTextComponent } from '@myrmidon/cadmus-ui';

@Component({
  selector: 'cadmus-pin-links-fragment-feature',
  templateUrl: './pin-links-fragment-feature.component.html',
  styleUrls: ['./pin-links-fragment-feature.component.css'],
  imports: [
    CurrentItemBarComponent,
    DecoratedTokenTextComponent,
    PinLinksFragmentComponent,
  ],
})
export class PinLinksFragmentFeatureComponent
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
      'pin-link-scopes',
      'pin-link-tags',
      'pin-link-assertion-tags',
      'pin-link-docref-types',
      'pin-link-docref-tags',
      'pin-link-settings',
    ];
  }
}
