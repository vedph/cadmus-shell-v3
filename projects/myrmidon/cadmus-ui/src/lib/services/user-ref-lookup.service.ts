import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { User } from '@myrmidon/auth-jwt-login';
import { DataPage } from '@myrmidon/ng-tools';

import { UserService } from '@myrmidon/cadmus-api';
import { UserInfo } from '@myrmidon/cadmus-core';
import {
  RefLookupFilter,
  RefLookupService,
} from '@myrmidon/cadmus-refs-lookup';

/**
 * Service for users lookup.
 */
@Injectable({
  providedIn: 'root',
})
export class UserRefLookupService implements RefLookupService {
  constructor(private _userService: UserService) {}

  lookup(filter: RefLookupFilter, options?: any): Observable<UserInfo[]> {
    return this._userService
      .getUsers(
        {
          name: filter.text,
        },
        1,
        filter.limit
      )
      .pipe(
        map((page: DataPage<UserInfo>) => {
          return page.items;
        })
      );
  }

  getName(item: User): string {
    return item?.userName;
  }
}
