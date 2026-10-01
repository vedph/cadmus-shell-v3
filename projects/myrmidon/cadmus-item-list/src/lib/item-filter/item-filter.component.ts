import {
  ChangeDetectionStrategy,
  Component,
  linkedSignal,
  signal,
  WritableSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FieldTree,
  FormField,
  form,
  maxLength,
} from '@angular/forms/signals';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';

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

import { FlagMatching, ItemFilter } from '@myrmidon/cadmus-core';
import { UserRefLookupService, UserWithRoles } from '@myrmidon/cadmus-ui';
import { AppRepository } from '@myrmidon/cadmus-state';

import { ItemListRepository } from '../state/item-list.repository';

/**
 * The editable shape behind the filter form. Text fields use '' as their
 * empty value, as they are bound to native inputs.
 */
interface ItemFilterControls {
  title: string;
  description: string;
  facet: string | null;
  group: string;
  flagMatching: FlagMatching;
  flags: number[] | null;
  minModified: Date | null;
  maxModified: Date | null;
  /** The picked user name: set via the user lookup, not from the filter. */
  user: string | null;
}

/**
 * The values of a cleared filter form.
 */
function makeEmptyDraft(): ItemFilterControls {
  return {
    title: '',
    description: '',
    facet: null,
    group: '',
    flagMatching: FlagMatching.none,
    flags: null,
    minModified: null,
    maxModified: null,
    user: null,
  };
}

function flagsToArray(flags: number | undefined): number[] {
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

function arrayToFlags(ids?: number[] | null): number | undefined {
  if (!ids) {
    return undefined;
  }
  let flags = 0;
  for (let i = 0; i < ids.length; i++) {
    flags |= ids[i];
  }
  return flags;
}

/**
 * Filter -> draft. The picked user is not synced from the filter: it is
 * kept from the current draft.
 */
function toDraft(
  filter: ItemFilter | undefined,
  user: string | null
): ItemFilterControls {
  if (!filter) {
    return { ...makeEmptyDraft(), user };
  }
  return {
    title: filter.title || '',
    description: filter.description || '',
    facet: filter.facetId || null,
    group: filter.groupId || '',
    flags: flagsToArray(filter.flags),
    // note: FlagMatching.bitsAllSet is 0, a falsy value, so this must use
    // ?? rather than || or a selected "bitsAllSet" filter would silently
    // revert to "none" whenever the form re-syncs from filter$
    flagMatching: filter.flagMatching ?? FlagMatching.none,
    minModified: filter.minModified || null,
    maxModified: filter.maxModified || null,
    user,
  };
}

/**
 * Items filter.
 */
@Component({
  selector: 'cadmus-item-filter',
  templateUrl: './item-filter.component.html',
  styleUrls: ['./item-filter.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
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
export class ItemFilterComponent {
  public filter$: Observable<ItemFilter>;

  /**
   * The editable draft: rebuilt from the repository filter whenever it
   * changes (including after apply), and locally edited in between.
   */
  private readonly _draft: WritableSignal<ItemFilterControls>;

  public readonly form: FieldTree<ItemFilterControls>;

  /**
   * The user picked in the user lookup, as provided by the lookup service.
   * It is bound back to the lookup, so it must keep the service's own
   * shape: the lookup displays it via the service's getName().
   */
  public readonly currentUser = signal<UserWithRoles | undefined>(undefined);

  constructor(
    private _repository: ItemListRepository,
    public userLookupService: UserRefLookupService,
    public app: AppRepository,
  ) {
    this.filter$ = _repository.filter$;

    const filter = toSignal(_repository.filter$);
    this._draft = linkedSignal<ItemFilter | undefined, ItemFilterControls>({
      source: filter,
      computation: (f, previous) => toDraft(f, previous?.value.user ?? null),
    });
    this.form = form(this._draft, (path) => {
      // [formField] renders these as the inputs' maxlength attributes
      maxLength(path.title, 500);
      maxLength(path.description, 500);
    });

    // ensure app data is loaded
    this.app.load();
  }

  private getFilter(): ItemFilter {
    const v = this._draft();
    return {
      title: v.title || undefined,
      description: v.description || undefined,
      facetId: v.facet || undefined,
      groupId: v.group || undefined,
      flags: arrayToFlags(v.flags),
      flagMatching: v.flagMatching,
      userId: v.user ? v.user : undefined,
      minModified: v.minModified ? v.minModified : undefined,
      maxModified: v.maxModified ? v.maxModified : undefined,
    };
  }

  public onUserChange(item?: unknown): void {
    const picked = item as UserWithRoles | undefined;
    if (picked?.user) {
      this.form.user().value.set(picked.user.userName);
      this.currentUser.set(picked);
    } else {
      this.form.user().value.set(null);
      this.currentUser.set(undefined);
    }
  }

  public reset() {
    this._draft.set(makeEmptyDraft());
    this.currentUser.set(undefined);
    this.apply();
  }

  public apply() {
    if (this.form().invalid()) {
      return;
    }
    const filter = this.getFilter();
    this._repository.setFilter(filter);
  }
}
