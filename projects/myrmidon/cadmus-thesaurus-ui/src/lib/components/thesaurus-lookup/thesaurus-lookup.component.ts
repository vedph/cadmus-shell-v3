import { AsyncPipe } from '@angular/common';
import { Component, effect, input, OnInit, output } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { ThesaurusFilter } from '@myrmidon/cadmus-core';
import { Observable, of } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
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

/**
 * Thesaurus ID lookup component.
 */
@Component({
  selector: 'cadmus-thesaurus-lookup',
  templateUrl: './thesaurus-lookup.component.html',
  styleUrls: ['./thesaurus-lookup.component.css'],
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
export class ThesaurusLookupComponent implements OnInit {
  /**
   * The entry value initially set when the component loads.
   */
  public readonly initialValue = input<string>();

  /**
   * The label to be displayed for this lookup.
   */
  public readonly label = input<string>('thesaurus');

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
  public readonly resetOnPick = input<boolean>(false);

  /**
   * The lookup function used to lookup thesauri.
   */
  public readonly lookupFn =
    input<(filter?: ThesaurusFilter, limit?: number) => Observable<string[]>>();

  public readonly entryChange = output<string | null>();

  public form: UntypedFormGroup;
  public lookup: UntypedFormControl;
  public ids$: Observable<string[]> | undefined;
  public id: string | undefined;

  constructor(formBuilder: UntypedFormBuilder) {
    // form
    this.lookup = formBuilder.control(null);
    this.form = formBuilder.group({
      lookup: this.lookup,
    });

    effect(() => {
      console.log('thesaurus lookup initial', this.initialValue());
      if (this.lookup) {
        this.resetToInitial();
      }
    });
  }

  private lookupEntries(filter: string, limit: number): Observable<string[]> {
    if (!filter || !this.lookupFn()) {
      return of([]);
    }
    const lookup = this.lookupFn()!;
    return lookup(
      {
        id: filter,
      },
      limit
    );
  }

  private resetToInitial(): void {
    this.lookupEntries(this.initialValue() || '', 1)
      .pipe(take(1))
      .subscribe((entries) => {
        this.lookup.setValue(entries.length ? entries[0] : undefined);
      });
  }

  public ngOnInit(): void {
    this.ids$ = this.lookup.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value: string | string) => {
        // if it's a string it's a filter; else it's the entry got
        if (typeof value === 'string') {
          return this.lookupEntries(value, this.limit() || 10);
        } else {
          return of([value]);
        }
      })
    );
    // setup initial value if its name was specified
    if (this.initialValue()) {
      this.resetToInitial();
    }
  }

  public clear(): void {
    this.id = undefined;
    this.lookup.setValue(null);
    this.entryChange.emit(null);
  }

  public pickId(id: string): void {
    this.id = id;
    this.entryChange.emit(id);
  }
}
