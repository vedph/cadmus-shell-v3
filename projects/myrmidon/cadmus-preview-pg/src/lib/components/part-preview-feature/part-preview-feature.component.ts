import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { MatCard, MatCardHeader, MatCardContent } from '@angular/material/card';

import {
  PartPreviewComponent,
  PartPreviewSource,
} from '@myrmidon/cadmus-preview-ui';

@Component({
  selector: 'cadmus-part-preview-feature',
  templateUrl: './part-preview-feature.component.html',
  styleUrls: ['./part-preview-feature.component.css'],
  imports: [MatCard, MatCardHeader, MatCardContent, PartPreviewComponent],
})
export class PartPreviewFeatureComponent {
  public source?: PartPreviewSource;

  constructor(route: ActivatedRoute) {
    this.source = {
      itemId: route.snapshot.params['iid'],
      partId: route.snapshot.params['pid'],
    };
  }
}
