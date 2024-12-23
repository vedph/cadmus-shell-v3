import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { DataPage } from '@myrmidon/ngx-tools';

import { UserService } from '@myrmidon/cadmus-api';
import {
  RefLookupFilter,
  RefLookupService,
} from '@myrmidon/cadmus-refs-lookup';

export interface UserWithRoles {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    userName: string;
    email: string;
  };
  roles: string[];
}

/**
 * Service for users lookup.
 */
@Injectable({
  providedIn: 'root',
})
export class UserRefLookupService implements RefLookupService {
  constructor(private _userService: UserService) {}

  public lookup(
    filter: RefLookupFilter,
    options?: any
  ): Observable<UserWithRoles[]> {
    return this._userService
      .getUsers(
        {
          name: filter.text,
        },
        1,
        filter.limit
      )
      .pipe(
        map((page: DataPage<UserWithRoles>) => {
          return page.items;
        })
      );
  }

  public getName(item: UserWithRoles): string {
    return item?.user?.userName;
  }
}
