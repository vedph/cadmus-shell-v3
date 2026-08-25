import { CsvThesaurusReader } from './csv-thesaurus-reader';

describe('CsvThesarusReader', () => {
  it('should be created', () => {
    expect(new CsvThesaurusReader('')).toBeTruthy();
  });

  it('should read a single thesaurus', () => {
    const reader = new CsvThesaurusReader(
      'languages@en,\n' + 'eng,English\n' + 'ita,Italian\n'
    );
    const thesaurus = reader.read();
    expect(thesaurus).toBeTruthy();
    if (!thesaurus) {
      return;
    }
    expect(thesaurus.id).toBe('languages@en');
    expect(thesaurus.language).toBe('en');
    expect(thesaurus.targetId).toBeFalsy();

    expect(thesaurus.entries!.length).toBe(2);
    expect(thesaurus.entries![0].id).toBe('eng');
    expect(thesaurus.entries![0].value).toBe('English');
    expect(thesaurus.entries![1].id).toBe('ita');
    expect(thesaurus.entries![1].value).toBe('Italian');
  });

  it('should read multiple thesauri', () => {
    const reader = new CsvThesaurusReader(
      'languages@en,\n' + 'eng,English\n' + 'ita,Italian\n' +
      'colors@en,\n' + 'r,red\n' + 'g,green\n'
    );

    // languages@en
    let thesaurus = reader.read();
    expect(thesaurus).toBeTruthy();
    if (!thesaurus) {
      return;
    }
    expect(thesaurus.id).toBe('languages@en');
    expect(thesaurus.language).toBe('en');
    expect(thesaurus.targetId).toBeFalsy();
    expect(thesaurus.entries!.length).toBe(2);
    expect(thesaurus.entries![0].id).toBe('eng');
    expect(thesaurus.entries![0].value).toBe('English');
    expect(thesaurus.entries![1].id).toBe('ita');
    expect(thesaurus.entries![1].value).toBe('Italian');

    // colors@en
    thesaurus = reader.read();
    expect(thesaurus).toBeTruthy();
    if (!thesaurus) {
      return;
    }
    expect(thesaurus.id).toBe('colors@en');
    expect(thesaurus.language).toBe('en');
    expect(thesaurus.targetId).toBeFalsy();
    expect(thesaurus.entries!.length).toBe(2);
    expect(thesaurus.entries![0].id).toBe('r');
    expect(thesaurus.entries![0].value).toBe('red');
    expect(thesaurus.entries![1].id).toBe('g');
    expect(thesaurus.entries![1].value).toBe('green');
  });

  it('should read aliases', () => {
    const reader = new CsvThesaurusReader(
      'biblio-languages@en,=languages\n'
    );
    const thesaurus = reader.read();
    expect(thesaurus).toBeTruthy();
    if (!thesaurus) {
      return;
    }
    expect(thesaurus.id).toBe('biblio-languages@en');
    expect(thesaurus.targetId).toBe('languages');
    // an alias thesaurus (targetId set) has no entries of its own by
    // design (see getThesaurus()'s `entries: targetId ? undefined : ...`),
    // not an empty array - the original assertion here (`.entries!.length`)
    // was itself buggy and threw on the undefined value
    expect(thesaurus.entries).toBeUndefined();
  });

  it('should return null once all thesauri have been read', () => {
    const reader = new CsvThesaurusReader('languages@en,\n' + 'eng,English\n');
    expect(reader.read()).toBeTruthy();
    expect(reader.read()).toBeNull();
    // and stays null on further calls
    expect(reader.read()).toBeNull();
  });

  it('should return null for empty text', () => {
    expect(new CsvThesaurusReader('').read()).toBeNull();
  });

  it('should default the language to "en" when the ID has no @ suffix', () => {
    const reader = new CsvThesaurusReader('colors,\n' + 'r,red\n');
    const thesaurus = reader.read();
    expect(thesaurus!.language).toBe('en');
  });

  it('should parse a thesaurus with a quoted value containing a comma', () => {
    // regression: this only works now that CsvReader's quote handling is
    // fixed - it used to throw on any quoted field
    const reader = new CsvThesaurusReader(
      'labels@en,\n' + 'a,"one, two"\n'
    );
    const thesaurus = reader.read();
    expect(thesaurus!.entries![0]).toEqual({ id: 'a', value: 'one, two' });
  });
});
