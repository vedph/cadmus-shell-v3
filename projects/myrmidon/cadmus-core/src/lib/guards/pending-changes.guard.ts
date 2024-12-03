import { Injectable } from '@angular/core';
import { map, Observable, take } from 'rxjs';

import { DialogService } from '@myrmidon/ngx-mat-tools';

// https://stackoverflow.com/questions/35922071/warn-user-of-unsaved-changes-before-leaving-page

/**
 * Interface implemented by those components which require a pending changes
 * guard. The implementor must keep its canDeactivate property up to date,
 * so that it reflects its dirty state.
 */
export interface ComponentCanDeactivate {
  canDeactivate: () => boolean | Observable<boolean>;
}

@Injectable({
  providedIn: 'root',
})
export class PendingChangesGuard {
  constructor(private _dialogService: DialogService) {}

  canDeactivate(
    component: ComponentCanDeactivate
  ): boolean | Observable<boolean> {
    // if there are no pending changes, just allow deactivation; else confirm first
    return !component || component.canDeactivate()
      ? true
      : this._dialogService
          .confirm(
            'Warning',
            'There are unsaved changes. Do you want to leave?'
          )
          .pipe(
            take(1),
            map((yes) => (yes ? true : false))
          );
  }
}
