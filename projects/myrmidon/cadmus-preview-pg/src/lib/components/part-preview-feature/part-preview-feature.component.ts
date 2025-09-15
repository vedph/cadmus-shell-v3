import { Component, signal } from '@angular/core';
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
  public readonly source = signal<PartPreviewSource>({
    itemId: '',
    partId: '',
  });

  constructor(route: ActivatedRoute) {
    console.log('PartPreviewFeatureComponent constructor called');
    const sourceValue = {
      itemId: route.snapshot.params['iid'],
      partId: route.snapshot.params['pid'],
    };
    console.log('Setting source to:', sourceValue);
    this.source.set(sourceValue);
  }
}
