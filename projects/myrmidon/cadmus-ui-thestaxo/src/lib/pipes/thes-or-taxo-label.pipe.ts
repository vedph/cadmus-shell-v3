import { inject, Pipe, PipeTransform } from '@angular/core';
import { map, Observable, of } from 'rxjs';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import {
  getThesaurusEntryLabel,
  resolveThesOrTaxoEntries,
  ThesOrTaxoSettings,
} from '../models';
import { ThesOrTaxoSourceService } from '../services/thes-or-taxo-source.service';

/**
 * Pipe getting the human-friendly label of a value picked with a
 * thesaurus-or-taxonomy picker, configured with the specified settings.
 * This is useful to display picked values in lists. The pipe returns an
 * observable, so you must chain it with the async pipe, e.g.:
 * `{{ e.type | thesOrTaxoLabel: typeSettings() : typeEntries() | async }}`.
 * The value itself is returned whenever its label is not found.
 */
@Pipe({ name: 'thesOrTaxoLabel' })
export class ThesOrTaxoLabelPipe implements PipeTransform {
  private readonly _source = inject(ThesOrTaxoSourceService);

  /**
   * Get the label of the specified value.
   * @param value The value (thesaurus entry ID or taxonomy node key).
   * @param settings The picker settings. When undefined, or when they
   * specify no mode, thesaurus mode is assumed.
   * @param entries The thesaurus entries provided by the editor, if any.
   * These are ignored when settings specify a thesaurus ID.
   * @returns Observable with the label, or the value itself if not found.
   */
  public transform(
    value: string | null | undefined,
    settings?: ThesOrTaxoSettings | null,
    entries?: readonly ThesaurusEntry[] | null,
  ): Observable<string> {
    if (!value) {
      return of('');
    }
    switch (settings?.mode ?? 'thesaurus') {
      case 'thesaurus': {
        const provided = resolveThesOrTaxoEntries(settings, entries);
        if (provided !== undefined || !settings?.source) {
          return of(getThesaurusEntryLabel(provided, value) ?? value);
        }
        return this._source
          .getThesaurusEntries(settings.source)
          .pipe(map((e) => getThesaurusEntryLabel(e, value) ?? value));
      }
      case 'taxonomy':
        return settings?.source
          ? this._source
              .getTaxoNodeLabel(settings.source, value)
              .pipe(map((label) => label ?? value))
          : of(value);
      default:
        return of(value);
    }
  }
}
