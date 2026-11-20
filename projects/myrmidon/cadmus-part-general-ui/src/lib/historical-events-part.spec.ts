import {
  buildRelationPrefix,
  DEFAULT_RELATION_FILTER,
  filterRelationEntries,
  resolveRelationFilter,
} from './historical-events-part';

const RELATIONS = [
  { id: 'person:birth:father', value: 'father' },
  { id: 'person:birth:mother', value: 'mother' },
  { id: 'person:job:employer', value: 'employer' },
  { id: 'place', value: 'place' },
];

describe('historical events relation filter', () => {
  describe('resolveRelationFilter', () => {
    it('returns the defaults for no filter', () => {
      expect(resolveRelationFilter()).toEqual(DEFAULT_RELATION_FILTER);
      expect(resolveRelationFilter(null)).toEqual(DEFAULT_RELATION_FILTER);
    });

    it('applies the defined properties only', () => {
      expect(
        resolveRelationFilter({ mode: 'none', tailCut: undefined }),
      ).toEqual({ ...DEFAULT_RELATION_FILTER, mode: 'none' });
    });

    it('uses the default tail cut unless the filter has one', () => {
      expect(resolveRelationFilter(undefined, 2).tailCut).toBe(2);
      expect(resolveRelationFilter({ tailCut: 1 }, 2).tailCut).toBe(1);
      expect(resolveRelationFilter({ tailCut: 0 }, 2).tailCut).toBe(0);
      expect(resolveRelationFilter(undefined, -1).tailCut).toBe(0);
    });
  });

  describe('buildRelationPrefix', () => {
    it('returns undefined for no type', () => {
      expect(buildRelationPrefix(undefined)).toBeUndefined();
      expect(buildRelationPrefix('')).toBeUndefined();
      expect(buildRelationPrefix('  ')).toBeUndefined();
    });

    it('turns the type into a prefix', () => {
      expect(buildRelationPrefix('person.birth')).toBe('person:birth:');
      expect(buildRelationPrefix('person.job.bishop')).toBe(
        'person:job:bishop:',
      );
      expect(buildRelationPrefix('flat')).toBe('flat:');
    });

    it('cuts the tail', () => {
      expect(buildRelationPrefix('person.job.bishop', { tailCut: 1 })).toBe(
        'person:job:',
      );
    });

    it('cuts parent entries', () => {
      expect(buildRelationPrefix('person.job.-')).toBe('person:job:');
      expect(buildRelationPrefix('person.job.-', { tailCut: 1 })).toBe(
        'person:',
      );
      expect(buildRelationPrefix('person.job.-', { parentSuffix: '' })).toBe(
        'person:job:-:',
      );
    });

    it('does not cut a single parent suffix', () => {
      expect(buildRelationPrefix('-')).toBe('-:');
    });

    it('returns undefined when nothing is left', () => {
      expect(buildRelationPrefix('a.b', { tailCut: 2 })).toBeUndefined();
      expect(buildRelationPrefix('a.b', { tailCut: 5 })).toBeUndefined();
    });

    it('returns undefined in none mode', () => {
      expect(buildRelationPrefix('a.b', { mode: 'none' })).toBeUndefined();
    });

    it('uses custom separators', () => {
      expect(
        buildRelationPrefix('person/birth', {
          typeSeparator: '/',
          relationSeparator: '.',
        }),
      ).toBe('person.birth.');
    });

    it('trims the type', () => {
      expect(buildRelationPrefix(' person.birth ')).toBe('person:birth:');
    });
  });

  describe('filterRelationEntries', () => {
    it('returns no entries for no entries', () => {
      expect(filterRelationEntries(undefined, 'person.birth')).toEqual([]);
      expect(filterRelationEntries([], 'person.birth')).toEqual([]);
    });

    it('returns all the entries for no prefix', () => {
      expect(filterRelationEntries(RELATIONS, '')).toEqual(RELATIONS);
      expect(
        filterRelationEntries(RELATIONS, 'person.birth', { mode: 'none' }),
      ).toEqual(RELATIONS);
    });

    it('filters entries by prefix', () => {
      expect(filterRelationEntries(RELATIONS, 'person.birth')).toEqual([
        RELATIONS[0],
        RELATIONS[1],
      ]);
      expect(
        filterRelationEntries(RELATIONS, 'person.job.bishop', { tailCut: 1 }),
      ).toEqual([RELATIONS[2]]);
    });

    it('returns no entries when none matches', () => {
      expect(filterRelationEntries(RELATIONS, 'work.creation')).toEqual([]);
    });

    it('falls back to all the entries when none matches, if requested', () => {
      expect(
        filterRelationEntries(RELATIONS, 'work.creation', {
          fallbackToAll: true,
        }),
      ).toEqual(RELATIONS);
    });

    it('returns a copy of the entries', () => {
      const result = filterRelationEntries(RELATIONS, '');
      expect(result).not.toBe(RELATIONS);
    });
  });
});
