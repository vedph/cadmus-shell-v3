import {
  TextSegment,
  TextSegmentBlock,
  TextSegmenter,
} from '@myrmidon/cadmus-text-segment';

import { TokenLocation } from '@myrmidon/cadmus-core';

/**
 * A point of token-based coordinates, as parsed from text.
 */
interface CoordsPoint {
  y: number;
  x: number;
  at?: number;
  run?: number;
}

/**
 * A token in a block of segments.
 */
interface Token {
  // the segments of the token (empty for an empty token)
  segments: TextSegment[];
  // the length of the token in UTF-16 code units
  length: number;
}

/**
 * The location of a non-whitespace segment in a token.
 */
interface SegmentLocation {
  // 1-based block ordinal
  y: number;
  // 1-based token ordinal in block
  x: number;
  // 0-based offset of the segment in its token, in UTF-16 code units
  offset: number;
  // the length of the segment in UTF-16 code units
  units: number;
  // the length of the token in UTF-16 code units
  tokenLength: number;
}

/**
 * The index built from a set of blocks, cached for them.
 */
interface TokenIndex {
  // tokens in each block: tokens[y-1][x-1]
  tokens: Token[][];
  // locations of non-whitespace segments, keyed by segment ID
  locations: Map<number, SegmentLocation>;
  // flat positions of all the segments, keyed by segment ID
  positions: Map<number, number>;
  // all the segments in their text order
  segments: TextSegment[];
}

const POINT_REGEX = /^(\d+)\.(\d+)(?:@(\d+)(?:x(\d+))?)?$/;
const WS_REGEX = /^\s$/u;
const COMBINING_REGEX = /^\p{M}$/u;

/**
 * The text segmenter for Cadmus token-based text layers. This is the
 * segmenter used by `DecoratedTokenTextComponent` to let users select
 * portions of a base text, and to map them to and from token-based
 * coordinates.
 *
 * It mirrors exactly the text model of the legacy `TextLayerService` (in
 * `@myrmidon/cadmus-core`) and of the backend (`TextLine.GetTokens` and
 * `TokenTextPart.GetText` in `Cadmus.General.Parts`), which is why it
 * differs from the generic `SpacedTextSegmenter` in a few corner cases:
 *
 * - **blocks**: the text is split into lines at each LF only. Each line is
 * trimmed (like `String.trim`), so that leading and trailing whitespaces,
 * including the CR of a CRLF pair, are not segments. Each line is a block,
 * even when empty.
 * - **segments**: each character (code point) of a trimmed line is a
 * segment. Whitespace segments are `wrapped`, so that a selection never
 * starts or ends with them; Unicode combining marks are `attached` to
 * their base character, so that a selection never splits them from it.
 * The segment ID is its UTF-16 offset in the source text + 1, and its index
 * is the UTF-16 offset in the source text.
 * - **tokens**: in a trimmed line, *each* whitespace character is a token
 * separator. So a run of N whitespaces delimits N-1 empty tokens, which
 * count for token ordinals: in `a  b` (two spaces), `b` is token 3. This is
 * what both the legacy frontend and the backend do; a collapsing segmenter
 * like `SpacedTextSegmenter` would instead make it token 2.
 * - **characters**: the `A` and `R` values of `Y.X@AxR` count UTF-16 code
 * units (like JavaScript and C# strings), not code points. This matters
 * only for characters outside the BMP.
 *
 * Its coordinates are token-based, and optionally character-based within
 * tokens. A point is `Y.X@AxR`, where `Y` is the block ordinal (1-N), `X`
 * the token ordinal in the block (1-N), and optionally `A` the ordinal of
 * the first character in the token (1-N) and `R` the count of characters
 * (1-N, omitted when 1). A selection within a single token has a single
 * point. A selection spanning several tokens has a start and an end point,
 * separated by `-`, both inclusive: the start point picks from its `A` to
 * the end of its token (its `R` is informative only), while the end point
 * picks the first `R` characters of its token (its `A` is always 1 when
 * generated, and is ignored when parsed, like the backend does).
 * Whitespace between tokens is included, while whitespace at the edges of
 * a selection is ignored.
 *
 * Coordinates are generated in their canonical form, which is the same
 * produced by `TokenLocation.toString()`.
 */
export class TokenTextSegmenter implements TextSegmenter {
  private readonly _indexes = new WeakMap<object, TokenIndex>();

  /**
   * True if the specified character is a whitespace (i.e. a token
   * separator).
   */
  public static isWhitespace(char: string): boolean {
    return WS_REGEX.test(char);
  }

  private static createSegment(char: string, index: number): TextSegment {
    const segment: TextSegment = { id: index + 1, index, value: char };
    if (WS_REGEX.test(char)) {
      segment.selectionMode = 'wrapped';
      // any whitespace is displayed as a space, like in the legacy view
      if (char !== ' ') {
        segment.label = ' ';
      }
    } else if (COMBINING_REGEX.test(char)) {
      segment.selectionMode = 'attached';
    }
    return segment;
  }

  /**
   * Get the blocks of segments from the specified text: one block per line,
   * one segment per character (code point) of the trimmed line.
   * @param text The text.
   * @returns The blocks.
   */
  public getBlocks(text?: string): TextSegmentBlock[] {
    if (!text) {
      return [];
    }
    const blocks: TextSegmentBlock[] = [];
    let lineStart = 0;
    for (const line of text.split('\n')) {
      const block: TextSegmentBlock = { index: blocks.length, segments: [] };
      const head = line.length - line.trimStart().length;
      const tail = line.trimEnd().length;
      let i = head;
      while (i < tail) {
        const cp = line.codePointAt(i)!;
        const char = String.fromCodePoint(cp);
        block.segments.push(
          TokenTextSegmenter.createSegment(char, lineStart + i),
        );
        i += char.length;
      }
      blocks.push(block);
      lineStart += line.length + 1;
    }
    return blocks;
  }

  private getIndex(blocks: readonly TextSegmentBlock[]): TokenIndex {
    let index = this._indexes.get(blocks);
    if (index) {
      return index;
    }
    const idx: TokenIndex = {
      tokens: [],
      locations: new Map(),
      positions: new Map(),
      segments: [],
    };

    blocks.forEach((block, yi) => {
      const tokens: Token[] = [];
      let token: Token = { segments: [], length: 0 };
      for (const segment of block.segments) {
        idx.positions.set(segment.id, idx.segments.length);
        idx.segments.push(segment);
        if (WS_REGEX.test(segment.value)) {
          // each whitespace closes the current token, even if empty
          tokens.push(token);
          token = { segments: [], length: 0 };
        } else {
          token.segments.push(segment);
          token.length += segment.value.length;
        }
      }
      // the last token (blocks are trimmed, so this is empty only when
      // the whole block is empty)
      if (token.segments.length) {
        tokens.push(token);
      }

      tokens.forEach((t, xi) => {
        let offset = 0;
        for (const segment of t.segments) {
          idx.locations.set(segment.id, {
            y: yi + 1,
            x: xi + 1,
            offset,
            units: segment.value.length,
            tokenLength: t.length,
          });
          offset += segment.value.length;
        }
      });
      idx.tokens.push(tokens);
    });

    this._indexes.set(blocks, idx);
    return idx;
  }

  /**
   * Get the coordinates of the specified segments, assumed to be contiguous
   * and in their text order. Whitespace segments at the edges are ignored.
   * @param blocks The blocks of the whole text.
   * @param segments The segments.
   * @returns The coordinates, or an empty string if the segments do not
   * include any token character.
   */
  public getSegmentCoords(
    blocks: readonly TextSegmentBlock[],
    segments: readonly TextSegment[],
  ): string {
    const index = this.getIndex(blocks);
    let first: SegmentLocation | undefined;
    let last: SegmentLocation | undefined;
    for (const s of segments) {
      const loc = index.locations.get(s.id);
      if (loc) {
        first ??= loc;
        last = loc;
      }
    }
    if (!first || !last) {
      return '';
    }
    const run = (r: number) => (r > 1 ? `x${r}` : '');
    const lastEnd = last.offset + last.units;

    // single token: Y.X or Y.X@AxR
    if (first.y === last.y && first.x === last.x) {
      if (first.offset === 0 && lastEnd === last.tokenLength) {
        return `${first.y}.${first.x}`;
      }
      return (
        `${first.y}.${first.x}@${first.offset + 1}` +
        run(lastEnd - first.offset)
      );
    }

    // several tokens: the start point runs to the end of its token,
    // the end point runs from the start of its token
    const start =
      first.offset === 0
        ? `${first.y}.${first.x}`
        : `${first.y}.${first.x}@${first.offset + 1}` +
          run(first.tokenLength - first.offset);
    const end =
      lastEnd === last.tokenLength
        ? `${last.y}.${last.x}`
        : `${last.y}.${last.x}@1${run(lastEnd)}`;
    return `${start}-${end}`;
  }

  /**
   * Get the location corresponding to the specified segments.
   * @param blocks The blocks of the whole text.
   * @param segments The segments.
   * @returns The location, or null if the segments do not include any
   * token character.
   */
  public getSegmentLocation(
    blocks: readonly TextSegmentBlock[],
    segments: readonly TextSegment[],
  ): TokenLocation | null {
    return TokenLocation.parse(this.getSegmentCoords(blocks, segments));
  }

  private static parsePoint(text: string): CoordsPoint | null {
    const m = POINT_REGEX.exec(text.trim());
    if (!m) {
      return null;
    }
    const point: CoordsPoint = { y: +m[1], x: +m[2] };
    if (m[3] !== undefined) point.at = +m[3];
    if (m[4] !== undefined) point.run = +m[4];
    if (point.y < 1 || point.x < 1 || point.at === 0 || point.run === 0) {
      return null;
    }
    return point;
  }

  /**
   * Get the segments of the specified token overlapping the specified
   * range of UTF-16 code units in it.
   */
  private static sliceToken(
    token: Token,
    start: number,
    end: number,
  ): TextSegment[] {
    const result: TextSegment[] = [];
    let offset = 0;
    for (const segment of token.segments) {
      const segEnd = offset + segment.value.length;
      if (segEnd > start && offset < end) {
        result.push(segment);
      }
      offset = segEnd;
    }
    return result;
  }

  private getSegments(
    index: TokenIndex,
    points: CoordsPoint[],
    lenient: boolean,
  ): TextSegment[] | null {
    const tokenAt = (p: CoordsPoint): Token | null => {
      const token = index.tokens[p.y - 1]?.[p.x - 1];
      return token?.segments.length ? token : null;
    };

    // the units range picked from the head token
    const head = points[0];
    const headToken = tokenAt(head);
    if (!headToken) {
      return null;
    }
    const headStart = head.at ? head.at - 1 : 0;
    if (headStart >= headToken.length) {
      return null;
    }

    // single point: from at to at+run-1, or the whole token
    if (points.length === 1) {
      let headEnd = head.at ? headStart + (head.run ?? 1) : headToken.length;
      if (headEnd > headToken.length) {
        if (!lenient) {
          return null;
        }
        headEnd = headToken.length;
      }
      return TokenTextSegmenter.sliceToken(headToken, headStart, headEnd);
    }

    // range: the head picks from its at to the end of its token, the
    // tail picks the first run characters of its token (its at is ignored)
    const first = TokenTextSegmenter.sliceToken(
      headToken,
      headStart,
      headToken.length,
    )[0];
    let last: TextSegment | undefined;
    const tail = points[1];
    const tailToken = tokenAt(tail);
    if (!tailToken) {
      if (!lenient) {
        return null;
      }
      // a broken range extends to the end of the text
      last = index.segments[index.segments.length - 1];
    } else {
      let tailEnd = tail.at ? (tail.run ?? 1) : tailToken.length;
      if (tailEnd > tailToken.length) {
        if (!lenient) {
          return null;
        }
        tailEnd = tailToken.length;
      }
      const picked = TokenTextSegmenter.sliceToken(tailToken, 0, tailEnd);
      last = picked[picked.length - 1];
    }

    const start = index.positions.get(first.id)!;
    const end = index.positions.get(last.id)!;
    if (start > end) {
      return null;
    }
    return index.segments.slice(start, end + 1);
  }

  /**
   * Get the segments included by the specified coordinates.
   * @param blocks The blocks of the whole text.
   * @param coords The coordinates.
   * @returns The segments in their text order, or null if the coordinates
   * are not valid or refer to a non-existing portion of the text.
   */
  public getCoordsSegments(
    blocks: readonly TextSegmentBlock[],
    coords: string,
  ): TextSegment[] | null {
    const parts = (coords || '').split('-');
    if (parts.length > 2) {
      return null;
    }
    const points = parts.map((p) => TokenTextSegmenter.parsePoint(p));
    if (points.some((p) => !p)) {
      return null;
    }
    return this.getSegments(
      this.getIndex(blocks),
      points as CoordsPoint[],
      false,
    );
  }

  /**
   * Get the segments included by the specified location. Unlike
   * `getCoordsSegments`, this is lenient, as it is used to display existing
   * layer fragments, whose locations might be partially broken (e.g. after
   * editing the base text): a run exceeding its token is truncated at the
   * token end, and a range whose end point does not exist extends to the
   * end of the text.
   * @param blocks The blocks of the whole text.
   * @param location The location.
   * @returns The segments in their text order, or null if the location
   * start does not exist.
   */
  public getLocationSegments(
    blocks: readonly TextSegmentBlock[],
    location: TokenLocation,
  ): TextSegment[] | null {
    if (!location?.primary) {
      return null;
    }
    const toPoint = (p: {
      y: number;
      x: number;
      at?: number;
      run?: number;
    }): CoordsPoint =>
      p.at ? { y: p.y, x: p.x, at: p.at, run: p.run || 1 } : { y: p.y, x: p.x };
    const points = [toPoint(location.primary)];
    if (location.secondary) {
      points.push(toPoint(location.secondary));
    }
    if (points.some((p) => p.y < 1 || p.x < 1)) {
      return null;
    }
    return this.getSegments(this.getIndex(blocks), points, true);
  }

  /**
   * Get the text of the specified segments, as it is displayed: blocks are
   * separated by a space, and any whitespace is a space. This is the same
   * text produced by `TextLayerService.getTextFragment`.
   * @param blocks The blocks of the whole text.
   * @param segments The segments, contiguous and in their text order.
   * @returns The text.
   */
  public getSegmentsText(
    blocks: readonly TextSegmentBlock[],
    segments: readonly TextSegment[],
  ): string {
    if (!segments.length) {
      return '';
    }
    const ids = new Set(segments.map((s) => s.id));
    const firstId = segments[0].id;
    const lastId = segments[segments.length - 1].id;
    const sb: string[] = [];
    let inside = false;
    for (const block of blocks) {
      if (inside) {
        sb.push(' ');
      }
      for (const s of block.segments) {
        if (s.id === firstId) {
          inside = true;
        }
        if (inside && ids.has(s.id)) {
          sb.push(WS_REGEX.test(s.value) ? ' ' : s.value);
        }
        if (s.id === lastId) {
          return sb.join('');
        }
      }
    }
    return sb.join('');
  }
}
