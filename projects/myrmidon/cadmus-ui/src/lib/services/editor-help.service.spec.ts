import { TestBed } from '@angular/core/testing';

import { EnvService } from '@myrmidon/ngx-tools';
import { FragmentIdentity, PartIdentity } from '@myrmidon/cadmus-core';

import {
  EditorHelpService,
  buildHelpUrlCandidates,
  fillHelpUrlTemplate,
  getHelpLanguageFallbacks,
  getHelpUrlParams,
  normalizeHelpLanguage,
  parseHelpUrlTemplates,
  resolveHelpLanguage,
} from './editor-help.service';

const PROJECT_TEMPLATE =
  'https://project.org/help[-{language}]/{typeId}{separator}{roleId}{separator}{frRoleId}.html';
const DEFAULT_TEMPLATE =
  'https://cadmus.org/help[-{language}]/{typeId}{separator}{roleId}{separator}{frRoleId}.html';

const TEMPLATE =
  'https://www.mysite.com/help/topics/{typeId}{separator}{roleId}{separator}{frRoleId}.html';

function makePartIdentity(roleId: string | null = null): PartIdentity {
  return { itemId: 'i', typeId: 'it.vedph.note', partId: 'p', roleId };
}

function makeFragmentIdentity(frRoleId: string | null = null): FragmentIdentity {
  return {
    itemId: 'i',
    typeId: '',
    partId: 'p',
    roleId: 'fr.it.vedph.comment',
    frTypeId: 'fr.it.vedph.comment',
    frRoleId,
    loc: '1.1',
  };
}

describe('getHelpUrlParams', () => {
  it('should return null for no identity', () => {
    expect(getHelpUrlParams(undefined)).toBeNull();
  });

  it('should map a part identity', () => {
    expect(getHelpUrlParams(makePartIdentity('history'))).toEqual({
      typeId: 'it.vedph.note',
      roleId: 'history',
    });
  });

  it('should map a fragment identity to fragment type and role', () => {
    expect(getHelpUrlParams(makeFragmentIdentity('sch'))).toEqual({
      typeId: 'fr.it.vedph.comment',
      frRoleId: 'sch',
    });
  });

  it('should return null for a part identity without type', () => {
    expect(
      getHelpUrlParams({ ...makePartIdentity(), typeId: '' })
    ).toBeNull();
  });
});

describe('fillHelpUrlTemplate', () => {
  it('should fill all placeholders', () => {
    expect(
      fillHelpUrlTemplate(TEMPLATE, {
        typeId: 'it.vedph.note',
        roleId: 'history',
        frRoleId: 'x',
      })
    ).toBe('https://www.mysite.com/help/topics/it.vedph.note__history__x.html');
  });

  it('should drop a missing roleId with its separator', () => {
    expect(fillHelpUrlTemplate(TEMPLATE, { typeId: 'it.vedph.note' })).toBe(
      'https://www.mysite.com/help/topics/it.vedph.note.html'
    );
  });

  it('should keep frRoleId when roleId is missing', () => {
    expect(
      fillHelpUrlTemplate(TEMPLATE, {
        typeId: 'fr.it.vedph.comment',
        frRoleId: 'sch',
      })
    ).toBe('https://www.mysite.com/help/topics/fr.it.vedph.comment__sch.html');
  });

  it('should use a custom separator', () => {
    expect(
      fillHelpUrlTemplate(
        TEMPLATE,
        { typeId: 'it.vedph.note', roleId: 'history' },
        '-'
      )
    ).toBe('https://www.mysite.com/help/topics/it.vedph.note-history.html');
  });

  it('should keep a standalone separator', () => {
    expect(
      fillHelpUrlTemplate('https://x.org/{typeId}{separator}.html', {
        typeId: 't',
      })
    ).toBe('https://x.org/t__.html');
  });

  it('should support optional groups for bookmarks', () => {
    const t = 'https://x.org/{typeId}.html[#{roleId}]';
    expect(fillHelpUrlTemplate(t, { typeId: 't', roleId: 'r' })).toBe(
      'https://x.org/t.html#r'
    );
    expect(fillHelpUrlTemplate(t, { typeId: 't' })).toBe(
      'https://x.org/t.html'
    );
  });

  it('should support optional groups for query strings', () => {
    const t = 'https://x.org/help?t={typeId}[&r={roleId}]';
    expect(fillHelpUrlTemplate(t, { typeId: 't', roleId: 'r' })).toBe(
      'https://x.org/help?t=t&r=r'
    );
    expect(fillHelpUrlTemplate(t, { typeId: 't' })).toBe(
      'https://x.org/help?t=t'
    );
  });

  it('should URI-encode values', () => {
    expect(
      fillHelpUrlTemplate('https://x.org/{typeId}[_{roleId}]', {
        typeId: 't',
        roleId: 'a b/c',
      })
    ).toBe('https://x.org/t_a%20b%2Fc');
  });
});

describe('parseHelpUrlTemplates', () => {
  it('should return empty for no value', () => {
    expect(parseHelpUrlTemplates(undefined)).toEqual([]);
    expect(parseHelpUrlTemplates('')).toEqual([]);
    expect(parseHelpUrlTemplates('  ')).toEqual([]);
    expect(parseHelpUrlTemplates([])).toEqual([]);
    expect(parseHelpUrlTemplates(true)).toEqual([]);
  });

  it('should parse a single template', () => {
    expect(parseHelpUrlTemplates(' https://x.org/{typeId} ')).toEqual([
      'https://x.org/{typeId}',
    ]);
  });

  it('should parse an array, skipping empty and non-string entries', () => {
    expect(
      parseHelpUrlTemplates(['https://a.org/{typeId}', '', 3, ' https://b.org/{typeId}'])
    ).toEqual(['https://a.org/{typeId}', 'https://b.org/{typeId}']);
  });

  it('should parse a whitespace-separated string', () => {
    expect(
      parseHelpUrlTemplates('https://a.org/{typeId}\n  https://b.org/{typeId}')
    ).toEqual(['https://a.org/{typeId}', 'https://b.org/{typeId}']);
  });
});

describe('normalizeHelpLanguage', () => {
  it('should normalize case and underscores', () => {
    expect(normalizeHelpLanguage(' en_US ')).toBe('en-us');
    expect(normalizeHelpLanguage('zh-Hant-TW')).toBe('zh-hant-tw');
  });

  it('should reject empty or invalid codes', () => {
    expect(normalizeHelpLanguage(undefined)).toBeNull();
    expect(normalizeHelpLanguage('')).toBeNull();
    expect(normalizeHelpLanguage('e n')).toBeNull();
    expect(normalizeHelpLanguage('../it')).toBeNull();
    expect(normalizeHelpLanguage('it-')).toBeNull();
  });
});

describe('getHelpLanguageFallbacks', () => {
  it('should return empty for no language', () => {
    expect(getHelpLanguageFallbacks(null)).toEqual([]);
  });

  it('should return a single code for a primary language', () => {
    expect(getHelpLanguageFallbacks('it')).toEqual(['it']);
  });

  it('should truncate subtags', () => {
    expect(getHelpLanguageFallbacks('it-IT')).toEqual(['it-it', 'it']);
    expect(getHelpLanguageFallbacks('zh-Hant-TW')).toEqual([
      'zh-hant-tw',
      'zh-hant',
      'zh',
    ]);
  });

  it('should drop trailing singletons', () => {
    expect(getHelpLanguageFallbacks('de-CH-x-phonebk')).toEqual([
      'de-ch-x-phonebk',
      'de-ch',
      'de',
    ]);
  });
});

describe('resolveHelpLanguage', () => {
  it('should return null when not set', () => {
    expect(resolveHelpLanguage(undefined, 'it-IT')).toBeNull();
    expect(resolveHelpLanguage(' ', 'it-IT')).toBeNull();
  });

  it('should return a literal code', () => {
    expect(resolveHelpLanguage('IT', 'en-US')).toBe('it');
  });

  it('should use the browser language for auto', () => {
    expect(resolveHelpLanguage('auto', 'it-IT')).toBe('it-it');
    expect(resolveHelpLanguage('AUTO', 'it-IT')).toBe('it-it');
    expect(resolveHelpLanguage('auto', undefined)).toBeNull();
  });
});

describe('fillHelpUrlTemplate with language', () => {
  it('should fill language in an optional group', () => {
    const t = 'https://x.org/help[-{language}]/{typeId}.html';
    expect(fillHelpUrlTemplate(t, { typeId: 't', language: 'it' })).toBe(
      'https://x.org/help-it/t.html'
    );
    expect(fillHelpUrlTemplate(t, { typeId: 't' })).toBe(
      'https://x.org/help/t.html'
    );
  });

  it('should fill language as a path segment', () => {
    const t = 'https://x.org/help/[{language}/]{typeId}.html';
    expect(fillHelpUrlTemplate(t, { typeId: 't', language: 'it' })).toBe(
      'https://x.org/help/it/t.html'
    );
    expect(fillHelpUrlTemplate(t, { typeId: 't' })).toBe(
      'https://x.org/help/t.html'
    );
  });
});

describe('buildHelpUrlCandidates', () => {
  it('should accept a single template as an array', () => {
    expect(
      buildHelpUrlCandidates(['{typeId}[_{roleId}]'], {
        typeId: 't',
        roleId: 'r',
      })
    ).toEqual(['t_r', 't']);
  });

  it('should try templates in order, each from most to least specific', () => {
    expect(
      buildHelpUrlCandidates(['a/{typeId}[_{roleId}]', 'b/{typeId}[_{roleId}]'], {
        typeId: 't',
        roleId: 'r',
      })
    ).toEqual(['a/t_r', 'a/t', 'b/t_r', 'b/t']);
  });

  it('should try languages within each topic, then no language', () => {
    expect(
      buildHelpUrlCandidates(
        ['a[-{language}]/{typeId}[_{roleId}]', 'b[-{language}]/{typeId}[_{roleId}]'],
        { typeId: 't', roleId: 'r' },
        '__',
        ['it-it', 'it']
      )
    ).toEqual([
      'a-it-it/t_r',
      'a-it/t_r',
      'a/t_r',
      'a-it-it/t',
      'a-it/t',
      'a/t',
      'b-it-it/t_r',
      'b-it/t_r',
      'b/t_r',
      'b-it-it/t',
      'b-it/t',
      'b/t',
    ]);
  });

  it('should ignore languages for templates without language', () => {
    expect(
      buildHelpUrlCandidates('{typeId}[_{roleId}]', { typeId: 't' }, '__', [
        'it',
      ])
    ).toEqual(['t']);
  });

  it('should ignore the language in params', () => {
    expect(
      buildHelpUrlCandidates('[{language}/]{typeId}', {
        typeId: 't',
        language: 'it',
      })
    ).toEqual(['t']);
  });

  it('should build candidates from most to least specific', () => {
    expect(
      buildHelpUrlCandidates('{typeId}[_{roleId}][_{frRoleId}]', {
        typeId: 't',
        roleId: 'r',
        frRoleId: 'f',
      })
    ).toEqual(['t_r_f', 't_r', 't']);
  });

  it('should remove duplicate candidates', () => {
    expect(
      buildHelpUrlCandidates('{typeId}[_{roleId}][_{frRoleId}]', {
        typeId: 't',
        roleId: 'r',
      })
    ).toEqual(['t_r', 't']);
    expect(
      buildHelpUrlCandidates('{typeId}[_{roleId}]', { typeId: 't' })
    ).toEqual(['t']);
  });
});

describe('EditorHelpService', () => {
  let env: Map<string, unknown>;
  let fetchMock: ReturnType<typeof vi.fn>;
  let service: EditorHelpService;

  function respond(existing: string[]) {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve({
        ok: existing.includes(url),
        status: existing.includes(url) ? 200 : 404,
      })
    );
  }

  beforeEach(() => {
    env = new Map<string, unknown>([['helpUrlTemplate', TEMPLATE]]);
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: EnvService,
          useValue: { get: (key: string) => env.get(key) },
        },
      ],
    });
    service = TestBed.inject(EditorHelpService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should return undefined without template, with no requests', async () => {
    env.delete('helpUrlTemplate');
    expect(await service.resolveUrl(makePartIdentity('history'))).toBe(
      undefined
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should return undefined without identity', async () => {
    expect(await service.resolveUrl(undefined)).toBe(undefined);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should return the most specific available URL', async () => {
    const url =
      'https://www.mysite.com/help/topics/it.vedph.note__history.html';
    respond([url, 'https://www.mysite.com/help/topics/it.vedph.note.html']);
    expect(await service.resolveUrl(makePartIdentity('history'))).toBe(url);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should fall back to the type-only URL', async () => {
    const url = 'https://www.mysite.com/help/topics/it.vedph.note.html';
    respond([url]);
    expect(await service.resolveUrl(makePartIdentity('history'))).toBe(url);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should fall back from fragment role to fragment type', async () => {
    const url = 'https://www.mysite.com/help/topics/fr.it.vedph.comment.html';
    respond([url]);
    expect(await service.resolveUrl(makeFragmentIdentity('sch'))).toBe(url);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      'https://www.mysite.com/help/topics/fr.it.vedph.comment__sch.html',
      url,
    ]);
  });

  it('should return undefined and log when nothing is available', async () => {
    respond([]);
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    expect(await service.resolveUrl(makePartIdentity('history'))).toBe(
      undefined
    );
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining(
        'https://www.mysite.com/help/topics/it.vedph.note__history.html'
      )
    );
    info.mockRestore();
  });

  it('should treat network/CORS errors as unavailable', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    vi.spyOn(console, 'info').mockImplementation(() => {});
    expect(await service.resolveUrl(makePartIdentity())).toBe(undefined);
  });

  it('should retry with GET when HEAD is not allowed', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 405 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    expect(await service.resolveUrl(makePartIdentity())).toBe(
      'https://www.mysite.com/help/topics/it.vedph.note.html'
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should cache URL checks', async () => {
    respond(['https://www.mysite.com/help/topics/it.vedph.note.html']);
    await service.resolveUrl(makePartIdentity());
    await service.resolveUrl(makePartIdentity());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should skip the check when helpUrlCheck is false', async () => {
    env.set('helpUrlCheck', false);
    expect(await service.resolveUrl(makePartIdentity('history'))).toBe(
      'https://www.mysite.com/help/topics/it.vedph.note__history.html'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should use the configured separator', async () => {
    env.set('helpUrlSeparator', '-');
    env.set('helpUrlCheck', 'false');
    expect(await service.resolveUrl(makePartIdentity('history'))).toBe(
      'https://www.mysite.com/help/topics/it.vedph.note-history.html'
    );
  });

  describe('with multiple templates', () => {
    beforeEach(() => {
      env.set('helpUrlTemplate', [PROJECT_TEMPLATE, DEFAULT_TEMPLATE]);
    });

    it('should fall back to the default site', async () => {
      const url = 'https://cadmus.org/help/it.vedph.note.html';
      respond([url]);
      expect(await service.resolveUrl(makePartIdentity('history'))).toBe(
        url
      );
      expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
        'https://project.org/help/it.vedph.note__history.html',
        'https://project.org/help/it.vedph.note.html',
        'https://cadmus.org/help/it.vedph.note__history.html',
        url,
      ]);
    });

    it('should let the project site override the default site', async () => {
      const url = 'https://project.org/help/it.vedph.note.html';
      respond([url, 'https://cadmus.org/help/it.vedph.note__history.html']);
      expect(await service.resolveUrl(makePartIdentity('history'))).toBe(
        url
      );
    });

    it('should accept a whitespace-separated string', async () => {
      env.set('helpUrlTemplate', `${PROJECT_TEMPLATE} ${DEFAULT_TEMPLATE}`);
      const url = 'https://cadmus.org/help/it.vedph.note.html';
      respond([url]);
      expect(await service.resolveUrl(makePartIdentity())).toBe(url);
    });

    it('should list candidates', () => {
      expect(service.getCandidates(makeFragmentIdentity('sch'))).toEqual([
        'https://project.org/help/fr.it.vedph.comment__sch.html',
        'https://project.org/help/fr.it.vedph.comment.html',
        'https://cadmus.org/help/fr.it.vedph.comment__sch.html',
        'https://cadmus.org/help/fr.it.vedph.comment.html',
      ]);
    });

    it('should use the first candidate without check', async () => {
      env.set('helpUrlCheck', false);
      expect(await service.resolveUrl(makePartIdentity('history'))).toBe(
        'https://project.org/help/it.vedph.note__history.html'
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('with language', () => {
    beforeEach(() => {
      env.set('helpUrlTemplate', [PROJECT_TEMPLATE, DEFAULT_TEMPLATE]);
    });

    it('should prefer the localized page', async () => {
      env.set('helpUrlLanguage', 'it');
      respond([
        'https://cadmus.org/help-it/it.vedph.note.html',
        'https://cadmus.org/help/it.vedph.note.html',
      ]);
      expect(await service.resolveUrl(makePartIdentity())).toBe(
        'https://cadmus.org/help-it/it.vedph.note.html'
      );
    });

    it('should fall back to the non-localized page', async () => {
      env.set('helpUrlLanguage', 'it');
      const url = 'https://cadmus.org/help/it.vedph.note.html';
      respond([url]);
      expect(await service.resolveUrl(makePartIdentity())).toBe(url);
      expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
        'https://project.org/help-it/it.vedph.note.html',
        'https://project.org/help/it.vedph.note.html',
        'https://cadmus.org/help-it/it.vedph.note.html',
        url,
      ]);
    });

    it('should prefer a more relevant page to a localized one', async () => {
      env.set('helpUrlLanguage', 'it');
      const url = 'https://project.org/help/it.vedph.note.html';
      respond([url, 'https://cadmus.org/help-it/it.vedph.note.html']);
      expect(await service.resolveUrl(makePartIdentity())).toBe(url);
    });

    it('should use the browser language for auto', async () => {
      env.set('helpUrlLanguage', 'auto');
      vi.spyOn(navigator, 'language', 'get').mockReturnValue('it-IT');
      expect(service.getCandidates(makePartIdentity())).toEqual([
        'https://project.org/help-it-it/it.vedph.note.html',
        'https://project.org/help-it/it.vedph.note.html',
        'https://project.org/help/it.vedph.note.html',
        'https://cadmus.org/help-it-it/it.vedph.note.html',
        'https://cadmus.org/help-it/it.vedph.note.html',
        'https://cadmus.org/help/it.vedph.note.html',
      ]);
    });

    it('should ignore an invalid language', () => {
      env.set('helpUrlLanguage', '../x');
      expect(service.getCandidates(makePartIdentity())).toEqual([
        'https://project.org/help/it.vedph.note.html',
        'https://cadmus.org/help/it.vedph.note.html',
      ]);
    });

    it('should use the localized page without check', async () => {
      env.set('helpUrlLanguage', 'it');
      env.set('helpUrlCheck', 'false');
      expect(await service.resolveUrl(makePartIdentity())).toBe(
        'https://project.org/help-it/it.vedph.note.html'
      );
    });
  });
});
