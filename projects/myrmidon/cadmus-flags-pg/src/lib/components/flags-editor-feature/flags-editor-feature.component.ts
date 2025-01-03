import { Component } from '@angular/core';
import {
  MatCard,
  MatCardHeader,
  MatCardTitle,
  MatCardContent,
} from '@angular/material/card';

import { FlagListComponent } from '@myrmidon/cadmus-flags-ui';

@Component({
  selector: 'cadmus-flags-editor-feature',
  templateUrl: './flags-editor-feature.component.html',
  styleUrls: ['./flags-editor-feature.component.css'],
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    FlagListComponent,
  ],
})
export class FlagsEditorFeatureComponent {}
