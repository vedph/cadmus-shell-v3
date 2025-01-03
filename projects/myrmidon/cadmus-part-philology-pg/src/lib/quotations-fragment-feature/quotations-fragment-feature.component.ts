import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  EditFragmentFeatureBase,
  FragmentEditorService,
} from '@myrmidon/cadmus-state';
import { LibraryRouteService } from '@myrmidon/cadmus-core';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import { QuotationsFragmentComponent } from '@myrmidon/cadmus-part-philology-ui';
import { DecoratedTokenTextComponent } from '@myrmidon/cadmus-ui';

@Component({
  selector: 'cadmus-quotations-fragment-feature',
  templateUrl: './quotations-fragment-feature.component.html',
  styleUrls: ['./quotations-fragment-feature.component.css'],
  imports: [
    CurrentItemBarComponent,
    DecoratedTokenTextComponent,
    QuotationsFragmentComponent,
  ],
})
export class QuotationsFragmentFeatureComponent
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
    return ['quotation-works', 'quotation-tags'];
  }
}
