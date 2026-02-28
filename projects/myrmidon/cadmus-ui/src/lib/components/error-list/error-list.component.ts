import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'cadmus-error-list',
  templateUrl: './error-list.component.html',
  styleUrls: ['./error-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorListComponent {
  public readonly errors = input<string[]>();
}
