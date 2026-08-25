import { SortPipe } from './sort.pipe';

describe('SortPipe', () => {
  it('create an instance', () => {
    const pipe = new SortPipe();
    expect(pipe).toBeTruthy();
  });

  it('should return the value unchanged when it is not an array', () => {
    const pipe = new SortPipe();
    expect(pipe.transform(null as any, 'name')).toBeNull();
    expect(pipe.transform(undefined as any, 'name')).toBeUndefined();
    expect(pipe.transform('not-an-array' as any, 'name')).toBe(
      'not-an-array'
    );
  });

  it('should sort objects ascending by the given property', () => {
    const pipe = new SortPipe();
    const value = [{ name: 'c' }, { name: 'a' }, { name: 'b' }];
    const result = pipe.transform(value, 'name') as { name: string }[];
    expect(result.map((v) => v.name)).toEqual(['a', 'b', 'c']);
  });

  it('should not mutate the original array', () => {
    const pipe = new SortPipe();
    const value = [{ name: 'c' }, { name: 'a' }];
    const result = pipe.transform(value, 'name');
    expect(result).not.toBe(value);
    expect(value.map((v) => v.name)).toEqual(['c', 'a']);
  });

  it('should sort falsy entries before truthy ones', () => {
    const pipe = new SortPipe();
    const value = [{ name: 'a' }, null, { name: 'b' }];
    const result = pipe.transform(value, 'name') as ({ name: string } | null)[];
    expect(result[0]).toBeNull();
    expect(result[1]!.name).toBe('a');
    expect(result[2]!.name).toBe('b');
  });

  it('should treat equal property values as equal', () => {
    const pipe = new SortPipe();
    const value = [{ name: 'a', id: 1 }, { name: 'a', id: 2 }];
    const result = pipe.transform(value, 'name') as { name: string; id: number }[];
    expect(result.map((v) => v.id).sort()).toEqual([1, 2]);
  });

  it('should return an empty array unchanged', () => {
    const pipe = new SortPipe();
    expect(pipe.transform([], 'name')).toEqual([]);
  });
});
