import {
  getThesaurusEntryLabel,
  isHierarchicalThesaurus,
  resolveThesaurusView,
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
});
