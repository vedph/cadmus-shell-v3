import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { Thesaurus } from '@myrmidon/cadmus-core';
import { ThesaurusService } from '@myrmidon/cadmus-api';

@Injectable({ providedIn: 'root' })
export class EditedThesaurusRepository {
  private _thesaurus$: BehaviorSubject<Thesaurus | undefined>;
  private _loading$: BehaviorSubject<boolean>;
  private _saving$: BehaviorSubject<boolean>;

  public loading$: Observable<boolean>;
  public saving$: Observable<boolean>;

  public get thesaurus$(): Observable<Thesaurus | undefined> {
    return this._thesaurus$.asObservable();
  }

  constructor(private _thesaurusService: ThesaurusService) {
    this._thesaurus$ = new BehaviorSubject<Thesaurus | undefined>(undefined);
    this._loading$ = new BehaviorSubject<boolean>(false);
    this.loading$ = this._loading$.asObservable();
    this._saving$ = new BehaviorSubject<boolean>(false);
    this.saving$ = this._saving$.asObservable();
  }

  public getThesaurus(): Thesaurus | undefined {
    return this._thesaurus$.value;
  }

  /**
   * Load the specified thesaurus.
   *
   * @param id The thesaurus ID or undefined to load a new thesaurus.
   */
  public load(id?: string): void {
    this._loading$.next(true);

    if (id) {
      this._thesaurusService.getThesaurus(id, true).subscribe({
        next: (thesaurus) => {
          this._loading$.next(false);
          this._thesaurus$.next(thesaurus);
        },
        error: (error) => {
          this._loading$.next(false);
          console.error('Error loding thesaurus', error);
        },
      });
    } else {
      this._thesaurus$.next({
        id: '',
        language: 'en',
        entries: [],
      });
    }
  }

  /**
   * Save the specified thesaurus.
   *
   * @param thesaurus The thesaurus to save.
   * @returns Promise with saved thesaurus.
   */
  public save(thesaurus: Thesaurus): Promise<Thesaurus> {
    this._saving$.next(true);

    return new Promise((resolve, reject) => {
      this._thesaurusService.addThesaurus(thesaurus).subscribe({
        next: (saved) => {
          this._saving$.next(false);
          this.load(saved.id);
          resolve(saved);
        },
        error: (error) => {
          this._saving$.next(false);
          console.error('Error loding thesaurus', error);
          reject(error);
        },
      });
    });
  }
}
