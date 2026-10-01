import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormField, form } from '@angular/forms/signals';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
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
})
export class ThesaurusLookupComponent {
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

  /**
   * The lookup text box: a filter string while the user is typing, or the
   * picked ID. Its empty value is null, never undefined: an undefined leaf
   * value unmaps its field.
   */
  public readonly form = form(signal<{ lookup: string | null }>({ lookup: null }));

  public readonly ids$: Observable<string[]>;
  public readonly id = signal<string | undefined>(undefined);

  constructor() {
    this.ids$ = toObservable(this.form.lookup().value).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value) => {
        // if it's a string it's a filter; else it's the entry got
        if (typeof value === 'string') {
          return this.lookupEntries(value, this.limit() || 10);
        } else {
          // unlike valueChanges, toObservable also emits the initial
          // null: map it to no entries rather than to an empty option
          return of(value ? [value] : []);
        }
      }),
    );

    // reset when initialValue changes, or when lookupFn changes while there
    // is an initial value to resolve (an empty one needs no lookup): these
    // are the only dependencies, as the reset itself (which reads other
    // signals and writes the form) is untracked
    effect(() => {
      if (this.initialValue()) {
        this.lookupFn();
      }
      untracked(() => this.resetToInitial());
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
      limit,
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
    this.id.set(undefined);
    this.form.lookup().value.set(null);
    this.entryChange.emit(null);
  }

  public pickId(id: string): void {
    this.id.set(id);
    this.entryChange.emit(id);
    if (this.resetOnPick()) {
      this.clear();
    }
  }
}
