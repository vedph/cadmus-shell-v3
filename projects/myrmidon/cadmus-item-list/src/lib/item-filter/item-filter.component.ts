import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormBuilder } from '@angular/forms';
import { Observable } from 'rxjs';

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
  standalone: false,
})
export class ItemFilterComponent implements OnInit {
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

  public currentUser?: UserInfo;

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
  }

  ngOnInit() {
    this.filter$.subscribe((f) => {
      this.updateForm(f);
    });
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

  public onUserChange(user?: UserInfo): void {
    this.user.setValue(user?.userName || null);
    this.currentUser = user;
  }

  public reset() {
    this.form.reset();
    this.currentUser = undefined;
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
