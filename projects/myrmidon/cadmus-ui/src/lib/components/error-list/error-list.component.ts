import { Component, Input } from '@angular/core';

@Component({
  selector: 'cadmus-error-list',
  templateUrl: './error-list.component.html',
  styleUrls: ['./error-list.component.css'],
})
export class ErrorListComponent {
  @Input()
  public errors?: string[];
}
