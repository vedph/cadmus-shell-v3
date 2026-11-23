import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatInput, MatLabel } from '@angular/material/input';

import { JsonDiffOptions, JsonDiffViewComponent } from '@myrmidon/cadmus-ui-diff';

const SAMPLE_LEFT = {
  id: 'a3f1c0de-0001-4b5e-9b1a-3c6d9e1f2a01',
  itemId: 'item-0001',
  typeId: 'it.vedph.categories',
  roleId: null,
  timeCreated: '2026-11-20T10:15:00Z',
  creatorId: 'zeus',
  timeModified: '2026-11-20T10:15:00Z',
  userId: 'zeus',
  categories: ['language.latin', 'genre.epigram', 'support.stone'],
  notes: [
    { id: 'n1', text: 'First reading by the editor.' },
    { id: 'n2', text: 'Checked against the squeeze.' },
    { id: 'n3', text: 'Photo available.' },
  ],
  description:
    'A funerary inscription found near the old harbour, reused as building material in a later wall.',
  dimensions: { width: 45, height: 60, unit: 'cm' },
};

const SAMPLE_RIGHT = {
  id: 'a3f1c0de-0001-4b5e-9b1a-3c6d9e1f2a01',
  itemId: 'item-0001',
  typeId: 'it.vedph.categories',
  roleId: null,
  timeCreated: '2026-11-20T10:15:00Z',
  creatorId: 'zeus',
  timeModified: '2026-11-22T16:40:00Z',
  userId: 'hera',
  categories: ['language.latin', 'genre.funerary', 'support.stone', 'date.2c'],
  notes: [
    { id: 'n3', text: 'Photo available.' },
    { id: 'n1', text: 'First reading by the editor.' },
    { id: 'n2', text: 'Checked against the squeeze and the photo.' },
  ],
  description:
    'A funerary inscription found near the ancient harbour, later reused as building material in a medieval wall.',
  dimensions: { width: 45, height: 62, depth: 12, unit: 'cm' },
};

@Component({
  selector: 'app-diff-demo-page',
  imports: [
    MatButton,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCheckbox,
    MatFormField,
    MatIcon,
    MatInput,
    MatLabel,
    JsonDiffViewComponent,
  ],
  templateUrl: './diff-demo-page.component.html',
  styleUrl: './diff-demo-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiffDemoPageComponent {
  public readonly left = signal<string>(JSON.stringify(SAMPLE_LEFT, null, 2));
  public readonly right = signal<string>(
    JSON.stringify(SAMPLE_RIGHT, null, 2),
  );
  public readonly showUnchanged = signal<boolean>(false);
  public readonly selectedTab = signal<number>(0);
  public readonly detectMove = signal<boolean>(true);
  public readonly textDiffs = signal<boolean>(true);

  public readonly options = computed<JsonDiffOptions>(() => ({
    detectMove: this.detectMove(),
    textDiffMinLength: this.textDiffs() ? 60 : 0,
  }));

  public onLeftInput(event: Event): void {
    this.left.set((event.target as HTMLTextAreaElement).value);
  }

  public onRightInput(event: Event): void {
    this.right.set((event.target as HTMLTextAreaElement).value);
  }

  public swap(): void {
    const left = this.left();
    this.left.set(this.right());
    this.right.set(left);
  }

  public loadSample(): void {
    this.left.set(JSON.stringify(SAMPLE_LEFT, null, 2));
    this.right.set(JSON.stringify(SAMPLE_RIGHT, null, 2));
  }

  public clear(): void {
    this.left.set('');
    this.right.set('');
  }
}
