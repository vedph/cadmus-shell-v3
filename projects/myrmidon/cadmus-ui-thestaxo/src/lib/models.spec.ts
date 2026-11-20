import {
  getThesaurusEntryLabel,
  isHierarchicalThesaurus,
  mergeThesOrTaxoSettings,
  resolveThesaurusView,
  resolveThesOrTaxoEntries,
} from './models';

const FLAT = [
  { id: 'red', value: 'red' },
  { id: 'green', value: 'green' },
];
const TREE = [
  { id: 'person', value: 'person' },
  { id: 'person.birth', value: 'person: birth' },
];

describe('models', () => {
  it('isHierarchicalThesaurus is false for no entries', () => {
    expect(isHierarchicalThesaurus(undefined)).toBe(false);
    expect(isHierarchicalThesaurus(null)).toBe(false);
    expect(isHierarchicalThesaurus([])).toBe(false);
  });

  it('isHierarchicalThesaurus detects dotted IDs', () => {
    expect(isHierarchicalThesaurus(FLAT)).toBe(false);
    expect(isHierarchicalThesaurus(TREE)).toBe(true);
  });

  it('resolveThesaurusView auto-detects the view', () => {
    expect(resolveThesaurusView(FLAT)).toBe('flat');
    expect(resolveThesaurusView(TREE)).toBe('tree');
    expect(resolveThesaurusView(TREE, 'auto')).toBe('tree');
  });

  it('resolveThesaurusView honors an explicit view', () => {
    expect(resolveThesaurusView(TREE, 'flat')).toBe('flat');
    expect(resolveThesaurusView(FLAT, 'tree')).toBe('tree');
  });

  it('getThesaurusEntryLabel finds labels', () => {
    expect(getThesaurusEntryLabel(TREE, 'person.birth')).toBe('person: birth');
    expect(getThesaurusEntryLabel(TREE, 'missing')).toBeUndefined();
    expect(getThesaurusEntryLabel(TREE, '')).toBeUndefined();
    expect(getThesaurusEntryLabel(undefined, 'person')).toBeUndefined();
  });

  it('mergeThesOrTaxoSettings applies defined properties in order', () => {
    expect(
      mergeThesOrTaxoSettings(
        { mode: 'thesaurus', thesaurusView: 'tree', canAddNode: true },
        undefined,
        null,
        { mode: 'taxonomy', source: 'events', thesaurusView: undefined },
        { canAddNode: false },
      ),
    ).toEqual({
      mode: 'taxonomy',
      source: 'events',
      thesaurusView: 'tree',
      canAddNode: false,
    });
  });

  it('mergeThesOrTaxoSettings returns empty settings for nothing', () => {
    expect(mergeThesOrTaxoSettings()).toEqual({});
    expect(mergeThesOrTaxoSettings(undefined, null)).toEqual({});
  });

  it('resolveThesOrTaxoEntries keeps entries unless a thesaurus ID is set', () => {
    expect(resolveThesOrTaxoEntries(undefined, FLAT)).toBe(FLAT);
    expect(resolveThesOrTaxoEntries({ mode: 'thesaurus' }, FLAT)).toBe(FLAT);
    expect(resolveThesOrTaxoEntries({ mode: 'taxonomy', source: 't' }, FLAT)).toBe(FLAT);
    expect(
      resolveThesOrTaxoEntries({ mode: 'thesaurus', source: 'x@en' }, FLAT),
    ).toBeUndefined();
  });
});
