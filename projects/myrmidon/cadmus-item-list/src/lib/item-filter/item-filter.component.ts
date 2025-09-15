import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { Observable, Subscription } from 'rxjs';

import {
  MatFormField,
  MatLabel,
  MatSuffix,
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';
import {
  MatDatepickerInput,
  MatDatepickerToggle,
  MatDatepicker,
} from '@angular/material/datepicker';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';

import { FlagMatching, ItemFilter, UserInfo } from '@myrmidon/cadmus-core';
import { UserRefLookupService } from '@myrmidon/cadmus-ui';
import { AppRepository } from '@myrmidon/cadmus-state';

import { ItemListRepository } from '../state/item-list.repository';

/**
 * Items filter.
 */
@Component({
  selector: 'cadmus-item-filter',
  templateUrl: './item-filter.component.html',
  styleUrls: ['./item-filter.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatSelect,
    MatOption,
    RefLookupComponent,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatSuffix,
    MatDatepicker,
    MatIconButton,
    MatTooltip,
    MatIcon,
    AsyncPipe,
  ],
})
export class ItemFilterComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;
  public filter$: Observable<ItemFilter>;

  public title: FormControl<string | null>;
  public description: FormControl<string | null>;
  public facet: FormControl<string | null>;
  public group: FormControl<string | null>;
  public flagMatching: FormControl<FlagMatching>;
  public flags: FormControl<number[] | null>;
  public minModified: FormControl<Date | null>;
  public maxModified: FormControl<Date | null>;
  public user: FormControl<string | null>;
  public form: FormGroup;

  public readonly currentUser = signal<UserInfo | undefined>(undefined);

  constructor(
    private _repository: ItemListRepository,
    public userLookupService: UserRefLookupService,
    public app: AppRepository,
    formBuilder: FormBuilder
  ) {
    this.filter$ = _repository.filter$;
    this.title = formBuilder.control(null);
    this.description = formBuilder.control(null);
    this.facet = formBuilder.control(null);
    this.group = formBuilder.control(null);
    this.flags = formBuilder.control(null);
    this.flagMatching = formBuilder.control(FlagMatching.none, {
      nonNullable: true,
    });
    this.minModified = formBuilder.control(null);
    this.maxModified = formBuilder.control(null);
    this.user = formBuilder.control(null);

    this.form = formBuilder.group({
      title: this.title,
      description: this.description,
      facet: this.facet,
      group: this.group,
      flags: this.flags,
      flagMatching: this.flagMatching,
      minModified: this.minModified,
      maxModified: this.maxModified,
      user: this.user,
    });
    // ensure app data is loaded
    this.app.load();
  }

  public ngOnInit() {
    this._sub = this.filter$.subscribe((f) => {
      this.updateForm(f);
    });
  }

  public ngOnDestroy() {
    this._sub?.unsubscribe();
  }

  private flagsToArray(flags: number | undefined): number[] {
    if (!flags) {
      return [];
    }
    const a = [];
    let n = 1;
    for (let i = 0; i < 32; i++) {
      if ((flags & n) === n) {
        a.push(n);
      }
      n <<= 1;
    }
    return a;
  }

  private arrayToFlags(ids?: number[] | null): number | undefined {
    if (!ids) {
      return undefined;
    }
    let flags = 0;
    for (let i = 0; i < ids.length; i++) {
      flags |= ids[i];
    }
    return flags;
  }

  private updateForm(filter: ItemFilter) {
    this.title.setValue(filter.title || null);
    this.description.setValue(filter.description || null);
    this.facet.setValue(filter.facetId || null);
    this.group.setValue(filter.groupId || null);
    this.flags.setValue(this.flagsToArray(filter.flags));
    this.flagMatching.setValue(filter.flagMatching || FlagMatching.none);
    this.minModified.setValue(filter.minModified || null);
    this.maxModified.setValue(filter.maxModified || null);
    this.form.markAsPristine();
  }

  private getFilter(): ItemFilter {
    return {
      title: this.title.value || undefined,
      description: this.description.value || undefined,
      facetId: this.facet.value || undefined,
      groupId: this.group.value || undefined,
      flags: this.arrayToFlags(this.flags.value),
      flagMatching: this.flagMatching.value,
      userId: this.user.value ? this.user.value : undefined,
      minModified: this.minModified.value ? this.minModified.value : undefined,
      maxModified: this.maxModified.value ? this.maxModified.value : undefined,
    };
  }

  public onUserChange(user?: unknown): void {
    const u = user as UserInfo | undefined;
    if (u) {
      this.user.setValue(u.userName);
      this.currentUser.set(u);
    } else {
      this.user.setValue(null);
      this.currentUser.set(undefined);
    }
  }

  public reset() {
    this.form.reset();
    this.currentUser.set(undefined);
    this.apply();
  }

  public apply() {
    if (this.form.invalid) {
      return;
    }
    const filter = this.getFilter();
    this._repository.setFilter(filter);
  }
}
