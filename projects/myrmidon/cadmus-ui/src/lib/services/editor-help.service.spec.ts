import { TestBed } from '@angular/core/testing';

import { EnvService } from '@myrmidon/ngx-tools';
import { FragmentIdentity, PartIdentity } from '@myrmidon/cadmus-core';

import {
  EditorHelpService,
  buildHelpUrlCandidates,
  fillHelpUrlTemplate,
  getHelpUrlParams,
} from './editor-help.service';

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

describe('buildHelpUrlCandidates', () => {
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
});
