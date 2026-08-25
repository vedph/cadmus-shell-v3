import { ProfileUtilService } from './profile-util.service';

interface Item {
  group: string;
  sub: string;
  name: string;
}

function makeItems(): Item[] {
  return [
    { group: 'a', sub: 'x', name: 'one' },
    { group: 'a', sub: 'x', name: 'two' },
    { group: 'a', sub: 'y', name: 'three' },
    { group: 'b', sub: 'x', name: 'four' },
  ];
}

describe('ProfileUtilService', () => {
  let service: ProfileUtilService;

  beforeEach(() => {
    service = new ProfileUtilService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('groupIntoObject', () => {
    it('should group by a single key', () => {
      const result = service.groupIntoObject(makeItems(), ['group']);
      expect(Object.keys(result).sort()).toEqual(['a', 'b']);
      expect(result['a'].map((i) => i.name)).toEqual(['one', 'two', 'three']);
      expect(result['b'].map((i) => i.name)).toEqual(['four']);
    });

    it('should group by multiple keys, joined with a colon', () => {
      const result = service.groupIntoObject(makeItems(), ['group', 'sub']);
      expect(Object.keys(result).sort()).toEqual(['a:x', 'a:y', 'b:x']);
      expect(result['a:x'].map((i) => i.name)).toEqual(['one', 'two']);
      expect(result['a:y'].map((i) => i.name)).toEqual(['three']);
    });

    it('should return an empty object for an empty array', () => {
      expect(service.groupIntoObject([], ['group'])).toEqual({});
    });
  });

  describe('groupIntoKeyedGroups', () => {
    it('should group by a single key into KeyedGroup entries', () => {
      const result = service.groupIntoKeyedGroups(makeItems(), ['group']);
      expect(result.map((g) => g.key)).toEqual(['a', 'b']);
      expect(result[0].items.map((i) => i.name)).toEqual([
        'one',
        'two',
        'three',
      ]);
      expect(result[1].items.map((i) => i.name)).toEqual(['four']);
    });

    it('should sort groups by their composite key', () => {
      const items: Item[] = [
        { group: 'z', sub: '', name: 'last' },
        { group: 'a', sub: '', name: 'first' },
      ];
      const result = service.groupIntoKeyedGroups(items, ['group']);
      expect(result.map((g) => g.key)).toEqual(['a', 'z']);
    });

    it('should return an empty array for an empty input', () => {
      expect(service.groupIntoKeyedGroups([], ['group'])).toEqual([]);
    });
  });
});
