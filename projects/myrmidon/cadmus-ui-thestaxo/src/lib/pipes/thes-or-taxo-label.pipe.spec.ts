import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { ThesOrTaxoSourceService } from '../services/thes-or-taxo-source.service';
import { ThesOrTaxoLabelPipe } from './thes-or-taxo-label.pipe';

const ENTRIES: ThesaurusEntry[] = [
  { id: 'person.birth', value: 'person: birth' },
];

describe('ThesOrTaxoLabelPipe', () => {
  let pipe: ThesOrTaxoLabelPipe;
  let source: {
    getThesaurusEntries: ReturnType<typeof vi.fn>;
    getTaxoNodeLabel: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    source = {
      getThesaurusEntries: vi.fn().mockReturnValue(
        of([{ id: 'red', value: 'Red' }]),
      ),
      getTaxoNodeLabel: vi.fn((_tree: string, key: string) =>
        of(key === 'birth' ? 'Birth' : null),
      ),
    };
    TestBed.configureTestingModule({
      providers: [
        ThesOrTaxoLabelPipe,
        { provide: ThesOrTaxoSourceService, useValue: source },
      ],
    });
    pipe = TestBed.inject(ThesOrTaxoLabelPipe);
  });

  function label(...args: Parameters<ThesOrTaxoLabelPipe['transform']>) {
    return firstValueFrom(pipe.transform(...args));
  }

  it('returns empty for no value', async () => {
    expect(await label(undefined)).toBe('');
    expect(await label('')).toBe('');
  });

  it('assumes thesaurus mode with provided entries', async () => {
    expect(await label('person.birth', undefined, ENTRIES)).toBe('person: birth');
    expect(await label('person.birth', {}, ENTRIES)).toBe('person: birth');
  });

  it('returns the value when not found among entries', async () => {
    expect(await label('legacy', { mode: 'thesaurus' }, ENTRIES)).toBe('legacy');
    expect(await label('legacy', undefined, undefined)).toBe('legacy');
  });

  it('loads the thesaurus set in settings, ignoring entries', async () => {
    expect(
      await label('red', { mode: 'thesaurus', source: 'colors@en' }, ENTRIES),
    ).toBe('Red');
    expect(source.getThesaurusEntries).toHaveBeenCalledWith('colors@en');
  });

  it('gets taxonomy node labels', async () => {
    const settings = { mode: 'taxonomy' as const, source: 'events' };
    expect(await label('birth', settings)).toBe('Birth');
    expect(await label('gone', settings)).toBe('gone');
    expect(source.getTaxoNodeLabel).toHaveBeenCalledWith('events', 'birth');
  });

  it('returns the value in taxonomy mode with no tree', async () => {
    expect(await label('birth', { mode: 'taxonomy' })).toBe('birth');
    expect(source.getTaxoNodeLabel).not.toHaveBeenCalled();
  });

  it('returns the value in unbound mode', async () => {
    expect(await label('free', { mode: 'unbound' }, ENTRIES)).toBe('free');
  });
});
