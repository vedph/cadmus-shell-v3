import { Component, OnInit } from '@angular/core';
import { take } from 'rxjs/operators';

import { ThesaurusService } from '@myrmidon/cadmus-api';
import { ThesauriSet, ThesaurusEntry } from '@myrmidon/cadmus-core';

@Component({
  selector: 'cadmus-graph-editor-feature',
  templateUrl: './graph-editor-feature.component.html',
  styleUrls: ['./graph-editor-feature.component.css'],
  standalone: false,
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
          if (error) {
            console.error(JSON.stringify(error));
          }
        },
      });
  }
}
