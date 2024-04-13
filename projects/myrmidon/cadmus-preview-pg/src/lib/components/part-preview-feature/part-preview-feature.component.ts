import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PartPreviewSource } from '@myrmidon/cadmus-preview-ui';

@Component({
  selector: 'cadmus-part-preview-feature',
  templateUrl: './part-preview-feature.component.html',
  styleUrls: ['./part-preview-feature.component.css'],
})
export class PartPreviewFeatureComponent implements OnInit {
  public source?: PartPreviewSource;

  constructor(route: ActivatedRoute) {
    this.source = {
      itemId: route.snapshot.params['iid'],
      partId: route.snapshot.params['pid'],
    };
  }

  ngOnInit(): void {}
}
