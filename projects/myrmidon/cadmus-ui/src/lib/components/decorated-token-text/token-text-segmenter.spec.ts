import { TextSegment, TextSegmentBlock } from '@myrmidon/cadmus-text-segment';
import { resolveSegmentRange } from '@myrmidon/cadmus-text-segment';

import { TextLayerService, TokenLocation } from '@myrmidon/cadmus-core';

import { TokenTextSegmenter } from './token-text-segmenter';

const TEXT = 'alpha beta\ngamma\ndelta epsilon waw\nzeta';

function values(segments: TextSegment[] | null): string | null {
  return segments ? segments.map((s) => s.value).join('') : null;
}

/**
 * Get the segments between the specified flat positions, resolving the
 * range like the viewer does when the user drags from the first to the
 * last position.
 */
function select(
  blocks: TextSegmentBlock[],
  from: number,
  to: number,
): TextSegment[] {
  const all = blocks.flatMap((b) => b.segments);
  const range = resolveSegmentRange(all, from, to);
  return range ? all.slice(range.start, range.end + 1) : [];
}

describe('TokenTextSegmenter', () => {
  let segmenter: TokenTextSegmenter;

  beforeEach(() => {
    segmenter = new TokenTextSegmenter();
  });

  describe('getBlocks', () => {
    it('should return no blocks for no text', () => {
      expect(segmenter.getBlocks('')).toEqual([]);
      expect(segmenter.getBlocks(undefined)).toEqual([]);
    });

    it('should return a block per line, a segment per char', () => {
      const blocks = segmenter.getBlocks('ab c\nd');
      expect(blocks.length).toBe(2);
      expect(blocks[0].segments.map((s) => s.value)).toEqual([
        'a',
        'b',
        ' ',
        'c',
      ]);
      expect(blocks[1].index).toBe(1);
      expect(blocks[1].segments.map((s) => s.value)).toEqual(['d']);
    });

    it('should set IDs and indexes from UTF-16 offsets', () => {
      const text = 'ab c\nd';
      const blocks = segmenter.getBlocks(text);
      for (const s of blocks.flatMap((b) => b.segments)) {
        expect(s.id).toBe(s.index + 1);
        expect(text.substring(s.index, s.index + s.value.length)).toBe(
          s.value,
        );
      }
    });

    it('should trim lines, dropping CR', () => {
      const blocks = segmenter.getBlocks('  ab \r\n\tc\r\n');
      expect(blocks.length).toBe(3);
      expect(values(blocks[0].segments)).toBe('ab');
      expect(values(blocks[1].segments)).toBe('c');
      expect(blocks[2].segments.length).toBe(0);
    });

    it('should keep empty lines as empty blocks', () => {
      const blocks = segmenter.getBlocks('a\n\nb');
      expect(blocks.map((b) => b.segments.length)).toEqual([1, 0, 1]);
    });

    it('should make whitespaces wrapped, labelled as space', () => {
      const blocks = segmenter.getBlocks('a \tb');
      const [, sp, tab] = blocks[0].segments;
      expect(sp.selectionMode).toBe('wrapped');
      expect(sp.label).toBeUndefined();
      expect(tab.selectionMode).toBe('wrapped');
      expect(tab.label).toBe(' ');
    });

    it('should make combining marks attached', () => {
      const blocks = segmenter.getBlocks('é');
      expect(blocks[0].segments[1].selectionMode).toBe('attached');
    });

    it('should keep surrogate pairs in a single segment', () => {
      const blocks = segmenter.getBlocks('a\u{1D504}b');
      expect(blocks[0].segments.map((s) => s.value)).toEqual([
        'a',
        '\u{1D504}',
        'b',
      ]);
      expect(blocks[0].segments.map((s) => s.index)).toEqual([0, 1, 3]);
    });
  });

  describe('getCoordsSegments', () => {
    let blocks: TextSegmentBlock[];
    beforeEach(() => (blocks = segmenter.getBlocks(TEXT)));

    // samples from the coordinates documentation
    it('2.1 should be gamma', () => {
      expect(values(segmenter.getCoordsSegments(blocks, '2.1'))).toBe('gamma');
    });
    it('1.2@2x2 should be et', () => {
      expect(values(segmenter.getCoordsSegments(blocks, '1.2@2x2'))).toBe(
        'et',
      );
    });
    it('3.1@4x2-3.2@1 should be "ta e"', () => {
      expect(
        values(segmenter.getCoordsSegments(blocks, '3.1@4x2-3.2@1')),
      ).toBe('ta e');
    });
    it('1.2@4-4.1@1x2 should be "a gamma delta epsilon waw ze"', () => {
      const segments = segmenter.getCoordsSegments(blocks, '1.2@4-4.1@1x2')!;
      expect(segmenter.getSegmentsText(blocks, segments)).toBe(
        'a gamma delta epsilon waw ze',
      );
    });

    it('1.2@3 should be the 3rd char only', () => {
      expect(values(segmenter.getCoordsSegments(blocks, '1.2@3'))).toBe('t');
    });

    it('should ignore the at of an end point, like the backend', () => {
      // the end point picks the first R chars of its token
      expect(values(segmenter.getCoordsSegments(blocks, '1.1-1.2@3x2'))).toBe(
        'alpha be',
      );
    });

    it('should reject invalid coordinates', () => {
      for (const c of [
        '',
        'x',
        '1',
        '1.',
        '0.1',
        '1.0',
        '1.1@0',
        '1.1@1x0',
        '1.1-1.2-1.3',
        '1.1-',
        '5.1',
        '1.3',
        '1.1@6',
        '1.1@5x2',
        '1.2-1.1',
      ]) {
        expect(segmenter.getCoordsSegments(blocks, c)).toBeNull();
      }
    });

    it('should count empty tokens in whitespace runs', () => {
      const b = segmenter.getBlocks('a  b');
      expect(segmenter.getCoordsSegments(b, '1.2')).toBeNull();
      expect(values(segmenter.getCoordsSegments(b, '1.3'))).toBe('b');
    });

    it('should count UTF-16 units for at and run', () => {
      const b = segmenter.getBlocks('a\u{1D504}b');
      expect(values(segmenter.getCoordsSegments(b, '1.1@2x2'))).toBe(
        '\u{1D504}',
      );
      expect(values(segmenter.getCoordsSegments(b, '1.1@4'))).toBe('b');
    });
  });

  describe('getLocationSegments', () => {
    let blocks: TextSegmentBlock[];
    beforeEach(() => (blocks = segmenter.getBlocks(TEXT)));

    it('should get the segments of a valid location', () => {
      expect(
        values(
          segmenter.getLocationSegments(
            blocks,
            TokenLocation.parse('3.1@4x2-3.2@1')!,
          ),
        ),
      ).toBe('ta e');
    });

    it('should truncate a run exceeding its token', () => {
      expect(
        values(
          segmenter.getLocationSegments(blocks, TokenLocation.parse('2.1@4x9')!),
        ),
      ).toBe('ma');
    });

    it('should extend a range with a missing end to the text end', () => {
      const segments = segmenter.getLocationSegments(
        blocks,
        TokenLocation.parse('3.3-9.1')!,
      )!;
      expect(segmenter.getSegmentsText(blocks, segments)).toBe('waw zeta');
    });

    it('should return null for a missing start', () => {
      expect(
        segmenter.getLocationSegments(blocks, TokenLocation.parse('9.1')!),
      ).toBeNull();
      expect(
        segmenter.getLocationSegments(blocks, TokenLocation.parse('1.1@9')!),
      ).toBeNull();
    });
  });

  describe('getSegmentCoords', () => {
    let blocks: TextSegmentBlock[];
    beforeEach(() => (blocks = segmenter.getBlocks(TEXT)));

    const coords = (c: string) =>
      segmenter.getSegmentCoords(
        blocks,
        segmenter.getCoordsSegments(blocks, c)!,
      );

    it('should return empty for no token chars', () => {
      expect(segmenter.getSegmentCoords(blocks, [])).toBe('');
      const space = blocks[0].segments[5];
      expect(segmenter.getSegmentCoords(blocks, [space])).toBe('');
    });

    it('should round-trip canonical coordinates', () => {
      for (const c of [
        '1.1',
        '1.2@2x2',
        '1.2@1x3',
        '1.2@4',
        '1.1-1.2',
        '1.1@5-1.2',
        '1.1@4x2-2.1@1x2',
        '3.1@4x2-3.2@1',
        '1.2@4-4.1@1x2',
        '1.1-4.1',
      ]) {
        expect(coords(c)).toBe(c);
      }
    });

    it('should ignore edge whitespaces', () => {
      // "a beta" + LF: from the last char of alpha, through the space
      const all = blocks.flatMap((b) => b.segments);
      expect(segmenter.getSegmentCoords(blocks, all.slice(5, 10))).toBe('1.2');
    });

    it('should match TokenLocation canonical form', () => {
      const c = coords('1.1@5x1-1.2@1x3');
      expect(c).toBe(TokenLocation.parse('1.1@5x1-1.2@1x3')!.toString());
      expect(c).toBe('1.1@5-1.2@1x3');
    });

    it('should get a location', () => {
      const loc = segmenter.getSegmentLocation(
        blocks,
        segmenter.getCoordsSegments(blocks, '1.2@2x2')!,
      );
      expect(loc?.toString()).toBe('1.2@2x2');
    });
  });

  describe('getSegmentsText', () => {
    it('should separate blocks with a space and normalize whitespace', () => {
      const blocks = segmenter.getBlocks('a\tb\n\nc');
      const all = blocks.flatMap((b) => b.segments);
      expect(segmenter.getSegmentsText(blocks, all)).toBe('a b  c');
    });
  });

  /*
   * Parity with the legacy TextLayerService: the coordinates system must
   * stay exactly the same. For each text, every selection starting and
   * ending at a non-whitespace character is simulated both as a DOM range
   * on the legacy rendition (getSelectedLocationForNew), and as a segment
   * range (getSegmentCoords); and the text of each resulting location is
   * compared with the legacy getTextFragment.
   */
  describe('parity with TextLayerService', () => {
    const service = new TextLayerService();
    const TEXTS = [
      TEXT,
      'alpha',
      'in principio erat verbum\net verbum erat apud deum',
      'a b c d\ne f\ng',
      'arma virumque\r\ncano troiae\r\nqui primus ab oris',
      '  lead and trail  \nnext',
      'tab\tseparated text',
      'cuḿ diacritics',
      'astral \u{1D504}\u{1D505} chars',
      'x\n\ny empty line',
      'double  and   triple spaces\nnext  line',
      'mixed \t whitespace nbsp',
    ];

    function getRenderedLines(text: string): {
      root: HTMLElement;
      texts: Text[];
    } {
      const root = document.createElement('div');
      root.innerHTML = service.render(text);
      document.body.appendChild(root);
      const texts = [...root.querySelectorAll('p')].map(
        (p) => (p.firstChild as Text) || null,
      );
      return { root, texts: texts as Text[] };
    }

    for (const text of TEXTS) {
      it(`should produce the same coordinates for ${JSON.stringify(text)}`, () => {
        const blocks = segmenter.getBlocks(text);
        const all = blocks.flatMap((b) => b.segments);
        const { root, texts } = getRenderedLines(text);
        // DOM (line, offset) of each segment: the rendered line has the
        // same length of the trimmed line, as whitespaces map 1:1 to spaces
        const domPos = new Map<number, { y: number; offset: number }>();
        blocks.forEach((b, y) => {
          const first = b.segments[0];
          for (const s of b.segments) {
            domPos.set(s.id, { y, offset: s.index - first.index });
          }
        });

        let compared = 0;
        try {
          for (let i = 0; i < all.length; i++) {
            if (TokenTextSegmenter.isWhitespace(all[i].value)) continue;
            if (all[i].selectionMode === 'attached') continue;
            for (let j = i; j < all.length; j++) {
              if (TokenTextSegmenter.isWhitespace(all[j].value)) continue;
              // new
              const segments = select(blocks, i, j);
              const newCoords = segmenter.getSegmentCoords(blocks, segments);

              // legacy: a DOM range from the start of segment i to the
              // end of segment j (including its attached segments)
              const last = segments[segments.length - 1];
              const start = domPos.get(all[i].id)!;
              const end = domPos.get(last.id)!;
              const range = document.createRange();
              range.setStart(texts[start.y], start.offset);
              range.setEnd(texts[end.y], end.offset + last.value.length);
              const oldLoc = service.getSelectedLocationForNew(range, text);

              expect(newCoords).toBe(oldLoc?.toString());

              // both resolve to the same text
              const loc = TokenLocation.parse(newCoords)!;
              expect(
                segmenter.getSegmentsText(
                  blocks,
                  segmenter.getCoordsSegments(blocks, newCoords)!,
                ),
              ).toBe(service.getTextFragment(text, loc));
              compared++;
            }
          }
        } finally {
          root.remove();
        }
        expect(compared).toBeGreaterThan(0);
      });
    }
  });
});
