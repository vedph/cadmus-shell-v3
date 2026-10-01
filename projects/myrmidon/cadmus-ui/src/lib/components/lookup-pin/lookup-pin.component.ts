import {
  ChangeDetectionStrategy,
  Component,
  effect,
  Inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormField, form } from '@angular/forms/signals';
import { Observable, of } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  switchMap,
  take,
} from 'rxjs/operators';

import {
  MatAutocomplete,
  MatAutocompleteTrigger,
} from '@angular/material/autocomplete';
import { MatOption } from '@angular/material/core';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';

import { DataPage, ErrorWrapper } from '@myrmidon/ngx-tools';

import { DataPinInfo, IndexLookupDefinitions } from '@myrmidon/cadmus-core';
import { ItemService } from '@myrmidon/cadmus-api';

/**
 * Generic data pin lookup component. This allows users typing a part
 * of a pin's value, and get the full pin. For instance, if you have
 * a lookup set of colors and type "gr", you might get the pins
 * corresponding to "green" (e.g. id=color, value=green), "gray", etc.
 * Usage: in the HTML template set the component's lookupKey, label,
 * initialValue, and entryChange handler, and store the picked
 * DataPinInfo value from entryChange. The initialValue, if any, should be the initial
 * DataPinInfo value.
 * If you are using this component as a pure lookup device, don't set
 * the initialValue and set resetOnPick=true.
 */
@Component({
  selector: 'cadmus-lookup-pin',
  templateUrl: './lookup-pin.component.html',
  styleUrls: ['./lookup-pin.component.css'],
  imports: [
    FormField,
    MatAutocomplete,
    MatOption,
    MatFormField,
    MatInput,
    MatAutocompleteTrigger,
    MatIconButton,
    MatTooltip,
    MatIcon,
    AsyncPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LookupPinComponent {
  /**
   * The entry value initially set when the component loads.
   */
  public readonly initialValue = input<string>();

  /**
   * The label to be displayed for this lookup.
   */
  public readonly label = input<string>('');

  /**
   * The maximum count of lookup entries to retrieve.
   * Default is 10.
   */
  public readonly limit = input<number>(10);

  /**
   * True to reset the lookup value after it is picked.
   * This is typically used when you use this component
   * as a pure lookup device, storing the picked value
   * elsewhere when handling its entryChange event.
   */
  public readonly resetOnPick = input<boolean>();

  /**
   * Fired whenever an entry is picked. Usually you should
   * cast the received argument to a more specific type.
   */
  public readonly entryChange = output<DataPinInfo | null>();

  /**
   * The lookup text box: a filter string while the user is typing, or the
   * picked entry once one is selected (the autocomplete trigger is a CVA,
   * so this is not restricted to strings). Its empty value is null, never
   * undefined: an undefined leaf value unmaps its field.
   */
  private readonly _draft = signal<{ lookup: DataPinInfo | string | null }>({
    lookup: null,
  });

  public readonly form = form(this._draft);

  public readonly entries$: Observable<DataPinInfo[]>;

  public readonly entry = signal<DataPinInfo | undefined>(undefined);

  constructor(
    private _itemService: ItemService,
    @Inject('indexLookupDefinitions')
    private _lookupDefs: IndexLookupDefinitions
  ) {
    this.entries$ = toObservable(this.form.lookup().value).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value) => {
        // if it's a string it's a filter; else it's the entry got
        if (typeof value === 'string') {
          return this.lookupEntries(value, this.limit());
        } else {
          // unlike valueChanges, toObservable also emits the initial
          // null: map it to no entries rather than to an empty option
          return of(value ? [value] : []);
        }
      })
    );

    // reset when initialValue or lookupKey change: these are the only
    // dependencies, as the reset itself (which reads other signals and
    // writes the form) is untracked
    effect(() => {
      this.initialValue();
      this.lookupKey();
      untracked(() => this.resetToInitial());
    });
  }

  /**
   * The lookup key to be used for this component.
   * This should be a key from the injectable indexLookupDefinitions.
   */
  public readonly lookupKey = input<string>();

  private lookupEntries(
    filter: string,
    limit: number
  ): Observable<DataPinInfo[]> {
    // get the lookup definition
    if (!this.lookupKey() || !filter) {
      return of([]);
    }
    const ld = this._lookupDefs[this.lookupKey()!];
    if (!ld) {
      return of([]);
    }

    // build query
    const query = ld.roleId
      ? `[partTypeId=${ld.typeId}] AND [roleId=${ld.roleId}] AND [name=${ld.name}] AND [value^=${filter}]`
      : `[partTypeId=${ld.typeId}] AND [name=${ld.name}] AND [value^=${filter}]`;

    // search
    return this._itemService.searchPins(query, 1, limit).pipe(
      map((w: ErrorWrapper<DataPage<DataPinInfo>>) => {
        if (w.error) {
          return [];
        } else {
          return w.value?.items || [];
        }
      })
    );
  }

  private resetToInitial(): void {
    this.lookupEntries(this.initialValue() || '', 1)
      .pipe(take(1))
      .subscribe((entries) => {
        this.form.lookup().value.set(entries.length ? entries[0] : null);
      });
  }

  public clear(): void {
    this.entry.set(undefined);
    this.form.lookup().value.set(null);
    this.entryChange.emit(null);
  }

  public entryToName(entry: DataPinInfo): string {
    return entry?.value;
  }

  public pickEntry(entry: DataPinInfo): void {
    this.entry.set(entry);
    this.entryChange.emit(entry);
    if (this.resetOnPick()) {
      this.clear();
    }
  }
}
