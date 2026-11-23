import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { JsonDiffService } from './json-diff.service';

describe('JsonDiffService', () => {
  let service: JsonDiffService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JsonDiffService);
  });

  describe('parse', () => {
    it('should treat null, undefined and blank as empty', () => {
      expect(service.parse(null)).toEqual({ empty: true });
      expect(service.parse(undefined)).toEqual({ empty: true });
      expect(service.parse('  \n ')).toEqual({ empty: true });
    });

    it('should parse valid JSON', () => {
      const result = service.parse('{"a":1}');
      expect(result.empty).toBe(false);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual({ a: 1 });
    });

    it('should report invalid JSON', () => {
      const result = service.parse('{a:1');
      expect(result.empty).toBe(false);
      expect(result.value).toBeUndefined();
      expect(result.error).toBeTruthy();
    });
  });

  describe('compare', () => {
    it('should find no changes for equal documents', () => {
      const result = service.compare('{"a":1,"b":[1,2]}', '{"b":[1,2],"a":1}');
      expect(result.delta).toBeUndefined();
      expect(result.hasChanges).toBe(false);
    });

    it('should find changes for different documents', () => {
      const result = service.compare('{"a":1}', '{"a":2,"b":true}');
      expect(result.hasChanges).toBe(true);
      expect(result.delta).toEqual({ a: [1, 2], b: [true] });
    });

    it('should not diff when a document is invalid', () => {
      const result = service.compare('{"a":1}', '{oops');
      expect(result.right.error).toBeTruthy();
      expect(result.delta).toBeUndefined();
      expect(result.hasChanges).toBe(false);
    });

    it('should treat a missing document as an added value', () => {
      const result = service.compare(null, '{"a":1}');
      expect(result.left.empty).toBe(true);
      expect(result.hasChanges).toBe(true);
      expect(result.delta).toEqual([{ a: 1 }]);
    });
  });

  describe('diff', () => {
    it('should detect array moves using object hash keys', () => {
      const delta = service.diff(
        [{ id: 'x', v: 1 }, { id: 'y', v: 2 }],
        [{ id: 'y', v: 2 }, { id: 'x', v: 1 }],
      ) as Record<string, unknown>;
      expect(delta['_t']).toBe('a');
      const moved = Object.values(delta).some(
        (d) => Array.isArray(d) && d[2] === 3,
      );
      expect(moved).toBe(true);
    });

    it('should use text diffs for long strings by default', () => {
      const a = 'The quick brown fox jumps over the lazy dog, again and again.';
      const b = 'The quick brown cat jumps over the lazy dog, again and again.';
      const delta = service.diff({ t: a }, { t: b }) as Record<
        string,
        unknown[]
      >;
      expect(delta['t'][2]).toBe(2);
    });

    it('should not use text diffs when disabled', () => {
      const a = 'The quick brown fox jumps over the lazy dog, again and again.';
      const b = 'The quick brown cat jumps over the lazy dog, again and again.';
      const delta = service.diff(
        { t: a },
        { t: b },
        { textDiffMinLength: 0 },
      ) as Record<string, unknown[]>;
      expect(delta['t']).toEqual([a, b]);
    });
  });

  describe('formatters', () => {
    it('should render visual HTML including unchanged values', () => {
      const left = { a: 1, keep: 'same' };
      const delta = service.diff(left, { a: 2, keep: 'same' });
      const html = service.toVisualHtml(delta, left);
      expect(html).toContain('jsondiffpatch-modified');
      expect(html).toContain('jsondiffpatch-unchanged');
      expect(html).toContain('keep');
    });

    it('should escape HTML in values', () => {
      const left = { a: '<b>x</b>' };
      const delta = service.diff(left, { a: '<i>y</i>' });
      const html = service.toVisualHtml(delta, left);
      expect(html).not.toContain('<i>');
      expect(html).toContain('&lt;i&gt;');
    });

    it('should render annotated HTML', () => {
      const left = { a: 1 };
      const delta = service.diff(left, { a: 1, b: 2 });
      const html = service.toAnnotatedHtml(delta, left);
      expect(html).toContain('jsondiffpatch-annotated-delta');
      expect(html).toContain('add property');
    });

    it('should render empty annotated HTML without delta', () => {
      expect(service.toAnnotatedHtml(undefined, { a: 1 })).toBe('');
    });

    it('should build JSON Patch operations', () => {
      const ops = service.toJsonPatch(
        { a: 1, b: 2, c: [1] },
        { a: 3, c: [1, 2], d: 'x' },
      );
      expect(ops).toEqual(
        expect.arrayContaining([
          { op: 'replace', path: '/a', value: 3 },
          { op: 'remove', path: '/b' },
          { op: 'add', path: '/c/1', value: 2 },
          { op: 'add', path: '/d', value: 'x' },
        ]),
      );
      expect(ops.length).toBe(4);
    });

    it('should build JSON Patch even for long text changes', () => {
      const a = 'The quick brown fox jumps over the lazy dog, again and again.';
      const b = 'The quick brown cat jumps over the lazy dog, again and again.';
      expect(service.toJsonPatch({ t: a }, { t: b })).toEqual([
        { op: 'replace', path: '/t', value: b },
      ]);
    });

    it('should build no JSON Patch operations for equal values', () => {
      expect(service.toJsonPatch({ a: 1 }, { a: 1 })).toEqual([]);
    });
  });

  describe('summarize', () => {
    it('should count operations by type', () => {
      const summary = service.summarize([
        { op: 'add', path: '/a', value: 1 },
        { op: 'add', path: '/b', value: 1 },
        { op: 'remove', path: '/c' },
        { op: 'replace', path: '/d', value: 2 },
        { op: 'move', from: '/e/0', path: '/e/1' },
      ]);
      expect(summary).toEqual({
        added: 2,
        removed: 1,
        replaced: 1,
        moved: 1,
        total: 5,
      });
    });
  });
});
