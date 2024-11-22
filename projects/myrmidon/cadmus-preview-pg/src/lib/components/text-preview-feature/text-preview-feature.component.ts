import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs/operators';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { PartPreviewSource } from '@myrmidon/cadmus-preview-ui';
import { AppRepository } from '@myrmidon/cadmus-state';

@Component({
  selector: 'cadmus-text-preview-feature',
  templateUrl: './text-preview-feature.component.html',
  styleUrls: ['./text-preview-feature.component.css'],
  standalone: false,
})
export class TextPreviewFeatureComponent implements OnInit {
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
  }

  ngOnInit(): void {}
}
