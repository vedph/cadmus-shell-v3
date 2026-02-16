import { ChangeDetectionStrategy, Component } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { SettingsImportComponent } from '../settings-import/settings-import.component';

@Component({
  selector: 'cadmus-settings-import-page',
  templateUrl: './settings-import-page.component.html',
  styleUrls: ['./settings-import-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatIconModule, SettingsImportComponent],
})
export class SettingsImportPageComponent {}
