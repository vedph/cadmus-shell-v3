import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs/operators';

import { MatCard, MatCardHeader, MatCardContent } from '@angular/material/card';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  PartPreviewSource,
  TextPreviewComponent,
} from '@myrmidon/cadmus-preview-ui';
import { AppRepository } from '@myrmidon/cadmus-state';

@Component({
  selector: 'cadmus-text-preview-feature',
  templateUrl: './text-preview-feature.component.html',
  styleUrls: ['./text-preview-feature.component.css'],
  imports: [MatCard, MatCardHeader, MatCardContent, TextPreviewComponent],
})
export class TextPreviewFeatureComponent {
  public source?: PartPreviewSource;
  public typeEntries?: ThesaurusEntry[];

  constructor(route: ActivatedRoute, appRepository: AppRepository) {
    this.source = {
      itemId: route.snapshot.params['iid'],
      partId: route.snapshot.params['pid'],
      layerId: route.snapshot.queryParams['lid'],
    };
    appRepository.typeThesaurus$.pipe(take(1)).subscribe((t) => {
      this.typeEntries = t?.entries;
    });
    // ensure app data is loaded
    appRepository.load().then(() => {
      this.typeEntries = appRepository.getTypeThesaurus()?.entries;
    });
  }
}
