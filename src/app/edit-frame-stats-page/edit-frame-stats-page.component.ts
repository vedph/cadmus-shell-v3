import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { EditFrameStatsComponent } from '../../../projects/myrmidon/cadmus-statistics/src/public-api';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-edit-frame-stats-page',
  imports: [MatCardModule, MatIcon, EditFrameStatsComponent],
  templateUrl: './edit-frame-stats-page.component.html',
  styleUrl: './edit-frame-stats-page.component.scss',
})
export class EditFrameStatsPageComponent {
  public startDate = new Date(new Date().setDate(new Date().getDate() - 7));
  public endDate = new Date();

  constructor() {
    this.startDate.setHours(0, 0, 0, 0);
  }
}
