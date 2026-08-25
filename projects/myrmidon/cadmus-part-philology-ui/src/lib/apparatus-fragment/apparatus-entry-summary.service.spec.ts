import { ApparatusEntrySummaryService } from './apparatus-entry-summary.service';
import {
  ApparatusEntry,
  ApparatusEntryType,
  ApparatusFragment,
} from '../apparatus-fragment';

function buildFragment(
  entries: ApparatusEntry[],
  extra?: Partial<ApparatusFragment>,
): ApparatusFragment {
  return {
    location: '1.1',
    entries,
    ...extra,
  };
}

function buildEntry(partial?: Partial<ApparatusEntry>): ApparatusEntry {
  return {
    type: ApparatusEntryType.replacement,
    ...partial,
  };
}

describe('ApparatusEntrySummaryService', () => {
  let service: ApparatusEntrySummaryService;

  beforeEach(() => {
    service = new ApparatusEntrySummaryService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  //#region build - empty/edge cases
  it('should return an empty string when entries is undefined', () => {
    const fr = { location: '1.1' } as unknown as ApparatusFragment;
    expect(service.build(fr)).toBe('');
  });

  it('should return an empty string when entries is empty', () => {
    const fr = buildFragment([]);
    expect(service.build(fr)).toBe('');
  });

  it('should return an empty string when fr itself is falsy', () => {
    expect(service.build(null as unknown as ApparatusFragment)).toBe('');
  });
  //#endregion

  //#region build - basic structure
  it('should wrap the output in an article element with a well-formed closing tag', () => {
    const fr = buildFragment([buildEntry({ value: 'abc' })]);
    const html = service.build(fr);
    expect(html.startsWith('<article class="apparatus-summary">')).toBe(true);
    // the closing tag must be well-formed (regression test: it used to be
    // emitted as '</article' without the closing '>')
    expect(html.endsWith('</article>')).toBe(true);
  });

  it('should include the fragment location', () => {
    const fr = buildFragment([buildEntry({ value: 'abc' })]);
    const html = service.build(fr);
    expect(html).toContain('<span class="adpar-loc">1.1</span>');
  });

  it('should include the fragment tag when present', () => {
    const fr = buildFragment([buildEntry({ value: 'abc' })], { tag: 'crux' });
    const html = service.build(fr);
    expect(html).toContain('<span class="adpar-tag">crux</span>');
  });

  it('should not render a tag span when the fragment has no tag', () => {
    const fr = buildFragment([buildEntry({ value: 'abc' })]);
    const html = service.build(fr);
    expect(html).not.toContain('adpar-tag');
  });
  //#endregion

  //#region build - single entry rendering
  it('should render an entry value without the accepted class when not accepted', () => {
    const fr = buildFragment([buildEntry({ value: 'lectio' })]);
    const html = service.build(fr);
    expect(html).toContain('<span class="adpar-value">lectio</span>');
  });

  it('should render an entry value with the accepted class when isAccepted is true', () => {
    const fr = buildFragment([
      buildEntry({ value: 'lectio', isAccepted: true }),
    ]);
    const html = service.build(fr);
    expect(html).toContain(
      '<span class="adpar-value adpar-accepted">lectio</span>',
    );
  });

  it('should render the normalized value in parentheses when present', () => {
    const fr = buildFragment([
      buildEntry({ value: 'lectio', normValue: 'norm' }),
    ]);
    const html = service.build(fr);
    expect(html).toContain(
      '<span class="adpar-value">lectio</span> (<span class="adpar-norm-value">norm</span>)',
    );
  });

  it('should not render a normValue span when normValue is absent', () => {
    const fr = buildFragment([buildEntry({ value: 'lectio' })]);
    const html = service.build(fr);
    expect(html).not.toContain('adpar-norm-value');
  });

  it('should render the entry tag when present', () => {
    const fr = buildFragment([buildEntry({ tag: 'add', value: 'x' })]);
    const html = service.build(fr);
    expect(html).toContain('<span class="adpar-etag">add</span>');
  });

  it('should render the entry note when present', () => {
    const fr = buildFragment([buildEntry({ value: 'x', note: 'a note' })]);
    const html = service.build(fr);
    expect(html).toContain('<span class="adpar-note">a note</span>');
  });

  it('should not render a value span when the entry has no value', () => {
    // type=note entries typically have no value, only a note
    const fr = buildFragment([
      buildEntry({ type: ApparatusEntryType.note, note: 'just a note' }),
    ]);
    const html = service.build(fr);
    expect(html).not.toContain('adpar-value');
    expect(html).toContain('<span class="adpar-note">just a note</span>');
  });
  //#endregion

  //#region build - witnesses and authors
  it('should render witnesses with value and note', () => {
    const fr = buildFragment([
      buildEntry({
        value: 'x',
        witnesses: [
          { value: 'w1', note: 'wn1' },
          { value: 'w2' },
        ],
      }),
    ]);
    const html = service.build(fr);
    expect(html).toContain('<span class="adpar-wit-v">w1</span>');
    expect(html).toContain('<span class="adpar-wit-n">wn1</span>');
    expect(html).toContain('<span class="adpar-wit-v">w2</span>');
  });

  it('should render authors with tag, value, note and location', () => {
    const fr = buildFragment([
      buildEntry({
        value: 'x',
        authors: [
          {
            tag: 'at',
            value: 'author1',
            note: 'an',
            location: '2.3',
          },
        ],
      }),
    ]);
    const html = service.build(fr);
    expect(html).toContain('<span class="adpar-aut-t">at</span>');
    expect(html).toContain('<span class="adpar-aut-v">author1</span>');
    expect(html).toContain('<span class="adpar-aut-n">an</span>');
    expect(html).toContain('<span class="adpar-aut-l">2.3</span>');
  });

  it('should render the author value even without a tag/note/location', () => {
    const fr = buildFragment([
      buildEntry({ value: 'x', authors: [{ value: 'author1' }] }),
    ]);
    const html = service.build(fr);
    expect(html).toContain('<span class="adpar-aut-v">author1</span>');
    expect(html).not.toContain('adpar-aut-t');
    expect(html).not.toContain('adpar-aut-n');
    expect(html).not.toContain('adpar-aut-l');
  });
  //#endregion

  //#region build - multiple entries and grouping
  it('should separate multiple ungrouped entries with a pipe', () => {
    const fr = buildFragment([
      buildEntry({ value: 'e1' }),
      buildEntry({ value: 'e2' }),
    ]);
    const html = service.build(fr);
    const e1Index = html.indexOf('e1');
    const pipeIndex = html.indexOf(' | ');
    const e2Index = html.indexOf('e2');
    expect(e1Index).toBeGreaterThan(-1);
    expect(pipeIndex).toBeGreaterThan(e1Index);
    expect(e2Index).toBeGreaterThan(pipeIndex);
  });

  it('should group entries by groupId when at least one entry has a groupId', () => {
    const fr = buildFragment([
      buildEntry({ value: 'e1', groupId: 'g1' }),
      buildEntry({ value: 'e2', groupId: 'g1' }),
      buildEntry({ value: 'e3' }),
    ]);
    const html = service.build(fr);
    // regression test: groupBy used to swallow its return value, so this
    // whole branch used to render nothing for any of the entries.
    expect(html).toContain('<span class="adpar-group">[g1]</span>');
    expect(html).toContain('e1');
    expect(html).toContain('e2');
    // ungrouped entries fall into the '' group key
    expect(html).toContain('<span class="adpar-group">[]</span>');
    expect(html).toContain('e3');
  });

  it('should join entries within the same group with a pipe', () => {
    const fr = buildFragment([
      buildEntry({ value: 'e1', groupId: 'g1' }),
      buildEntry({ value: 'e2', groupId: 'g1' }),
    ]);
    const html = service.build(fr);
    const groupIndex = html.indexOf('[g1]');
    const e1Index = html.indexOf('e1');
    const pipeIndex = html.indexOf(' | ', e1Index);
    const e2Index = html.indexOf('e2');
    expect(groupIndex).toBeGreaterThan(-1);
    expect(e1Index).toBeGreaterThan(groupIndex);
    expect(pipeIndex).toBeGreaterThan(e1Index);
    expect(e2Index).toBeGreaterThan(pipeIndex);
  });
  //#endregion
});
