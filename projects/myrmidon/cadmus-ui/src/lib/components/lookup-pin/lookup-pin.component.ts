import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import {
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
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
 * Usage: add a FormControl to hold a DataPinInfo value; in the HTML
 * template set the component's lookupKey, label, initialValue, and
 * entryChange handler. The initialValue, if any, should be the initial
 * DataPinInfo value.
 * If you are using this component as a pure lookup device, don't set
 * the initialValue and set resetOnPick=true.
 */
@Component({
  selector: 'cadmus-lookup-pin',
  templateUrl: './lookup-pin.component.html',
  styleUrls: ['./lookup-pin.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
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
})
export class LookupPinComponent implements OnInit {
  private _initialValue: string | undefined;

  /**
   * The entry value initially set when the component loads.
   */
  @Input()
  public get initialValue(): string | undefined {
    return this._initialValue;
  }
  public set initialValue(value: string | undefined) {
    this._initialValue = value;
    if (this.lookup) {
      this.resetToInitial();
    }
  }

  /**
   * The label to be displayed for this lookup.
   */
  @Input()
  public label: string;

  /**
   * The maximum count of lookup entries to retrieve.
   * Default is 10.
   */
  @Input()
  public limit: number;

  /**
   * True to reset the lookup value after it is picked.
   * This is typically used when you use this component
   * as a pure lookup device, storing the picked value
   * elsewhere when handling its entryChange event.
   */
  @Input()
  public resetOnPick: boolean | undefined;

  /**
   * Fired whenever an entry is picked. Usually you should
   * cast the received argument to a more specific type.
   */
  @Output()
  public entryChange: EventEmitter<DataPinInfo | null>;

  public form: UntypedFormGroup;
  public lookup: UntypedFormControl;
  public entries$: Observable<DataPinInfo[]> | undefined;
  public entry: DataPinInfo | undefined;

  constructor(
    formBuilder: UntypedFormBuilder,
    private _itemService: ItemService,
    @Inject('indexLookupDefinitions')
    private _lookupDefs: IndexLookupDefinitions
  ) {
    this.label = '';
    // events
    this.entryChange = new EventEmitter<DataPinInfo | null>();
    // form
    this.lookup = formBuilder.control(null);
    this.form = formBuilder.group({
      lookup: this.lookup,
    });
    this.limit = 10;
  }

  /**
   * The lookup key to be used for this component.
   * This should be a key from the injectable indexLookupDefinitions.
   */
  @Input()
  public lookupKey: string | undefined;

  ngOnInit(): void {
    this.entries$ = this.lookup.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value: DataPinInfo | string) => {
        // if it's a string it's a filter; else it's the entry got
        if (typeof value === 'string') {
          return this.lookupEntries(value, this.limit || 10);
        } else {
          return of([value]);
        }
      })
    );
    // setup initial value if its name was specified
    if (this._initialValue) {
      this.resetToInitial();
    }
  }

  private lookupEntries(
    filter: string,
    limit: number
  ): Observable<DataPinInfo[]> {
    // get the lookup definition
    if (!this.lookupKey || !filter) {
      return of([]);
    }
    const ld = this._lookupDefs[this.lookupKey];
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
    this.lookupEntries(this._initialValue || '', 1)
      .pipe(take(1))
      .subscribe((entries) => {
        this.lookup.setValue(entries.length ? entries[0] : undefined);
      });
  }

  public clear(): void {
    this.entry = undefined;
    this.lookup.setValue(null);
    this.entryChange.emit(null);
  }

  public entryToName(entry: DataPinInfo): string {
    return entry?.value;
  }

  public pickEntry(entry: DataPinInfo): void {
    this.entry = entry;
    this.entryChange.emit(entry);
    if (this.resetOnPick) {
      this.clear();
    }
  }
}
