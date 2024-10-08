import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { FlagDefinition } from '@myrmidon/cadmus-core';
import { FlagService } from '@myrmidon/cadmus-api';

@Injectable({ providedIn: 'root' })
export class FlagListRepository {
  private _flags$: BehaviorSubject<FlagDefinition[]>;
  private _activeFlag$: BehaviorSubject<FlagDefinition | null>;
  private _loading$: BehaviorSubject<boolean>;

  public get flags$(): Observable<FlagDefinition[]> {
    return this._flags$.asObservable();
  }
  public get activeFlag$(): Observable<FlagDefinition | null> {
    return this._activeFlag$.asObservable();
  }
  public get loading$(): Observable<boolean> {
    return this._loading$.asObservable();
  }

  constructor(private _flagService: FlagService) {
    this._flags$ = new BehaviorSubject<FlagDefinition[]>([]);
    this._activeFlag$ = new BehaviorSubject<FlagDefinition | null>(null);
    this._loading$ = new BehaviorSubject<boolean>(false);
    this.reset();
  }

  public reset(): void {
    this._activeFlag$.next(null);
    if (!this._flagService) {
      return;
    }
    this._loading$.next(true);
    this._flagService.getFlags().subscribe((defs) => {
      this._flags$.next(defs);
      this._loading$.next(false);
    });
  }

  public getFlags(): FlagDefinition[] {
    return this._flags$.value || [];
  }

  public getCount(): number {
    return this._flags$.value?.length || 0;
  }

  public save(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this._flagService) {
        resolve();
        return;
      }
      this._loading$.next(true);
      this._flagService.addFlags(this._flags$.value).subscribe((_) => {
        this._loading$.next(false);
        resolve();
      });
    });
  }

  private getNextId(): number {
    const ids = this._flags$.value.map((d) => d.id) || [];

    for (let i = 0; i < 32; i++) {
      const testId = 1 << i;
      if (
        ids.findIndex((id) => {
          return testId === id;
        }) === -1
      ) {
        return testId;
      }
    }
    return 0;
  }

  /**
   * Add a new flag definition to the list and set it as the active
   * flag.
   *
   * @returns The ID of the new flag definition or 0 if no more flags
   * available.
   */
  public addNewFlag(): number {
    const id = this.getNextId();
    if (!id) {
      return 0;
    }
    const def: FlagDefinition = {
      id: id,
      label: id.toString(),
      description: '',
      colorKey: 'f00000',
    };
    this._flags$.next([...this._flags$.value, def]);
    this._activeFlag$.next(def);
    return id;
  }

  /**
   * Delete the flag with the specified ID.
   *
   * @param id The flag's ID.
   */
  public deleteFlag(id: number): void {
    if (this._activeFlag$.value?.id === id) {
      this._activeFlag$.next(null);
    }
    this._flags$.next(
      this._flags$.value.filter((f) => {
        return f.id !== id;
      })
    );
  }

  /**
   * Adds or updates the specified flag in the store.
   *
   * @param flag The updated flag.
   */
  public addFlag(flag: FlagDefinition): void {
    const flags = [...this._flags$.value];
    const i = flags.findIndex((f) => {
      return f.id === flag.id;
    });
    if (i > -1) {
      flags.splice(i, 1, flag);
      this._flags$.next(flags);
    } else {
      this._flags$.next([...flags, flag]);
    }
  }

  /**
   * Set the active flag.
   *
   * @param id The ID of the flag to set, or null.
   */
  public setActive(id: number | null): void {
    const flag = this._flags$.value.find((f) => {
      return f.id === id;
    });
    this._activeFlag$.next(flag || null);
  }
}
