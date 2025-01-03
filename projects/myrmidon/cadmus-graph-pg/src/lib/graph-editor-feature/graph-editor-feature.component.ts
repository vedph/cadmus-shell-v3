import { Component, OnInit } from '@angular/core';
import { take } from 'rxjs/operators';

import { MatCard, MatCardHeader, MatCardContent } from '@angular/material/card';
import { MatTabGroup, MatTab } from '@angular/material/tabs';

import { ThesaurusService } from '@myrmidon/cadmus-api';
import { ThesauriSet, ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  GraphNodeListComponent,
  GraphTripleListComponent,
} from '@myrmidon/cadmus-graph-ui';

@Component({
  selector: 'cadmus-graph-editor-feature',
  templateUrl: './graph-editor-feature.component.html',
  styleUrls: ['./graph-editor-feature.component.css'],
  imports: [
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatTabGroup,
    MatTab,
    GraphNodeListComponent,
    GraphTripleListComponent,
  ],
})
export class GraphEditorFeatureComponent implements OnInit {
  public nodeTagEntries?: ThesaurusEntry[];
  public tripleTagEntries?: ThesaurusEntry[];

  constructor(private _thesService: ThesaurusService) {}

  public ngOnInit(): void {
    this._thesService
      .getThesauriSet(['graph-node-tags', 'graph-triple-tags'])
      .pipe(take(1))
      .subscribe({
        next: (set: ThesauriSet) => {
          this.nodeTagEntries = set['graph-node-tags']?.entries;
          this.tripleTagEntries = set['graph-triple-tags']?.entries;
        },
        error: (error) => {
          console.error('Error getting thesauri set', error);
        },
      });
  }
}
