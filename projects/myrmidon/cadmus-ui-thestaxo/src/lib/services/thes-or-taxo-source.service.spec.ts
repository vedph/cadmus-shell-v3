import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';

import { ThesaurusService } from '@myrmidon/cadmus-api';
import { TaxoStoreService } from '@myrmidon/taxo-store-api';

import { ThesOrTaxoSourceService } from './thes-or-taxo-source.service';

describe('ThesOrTaxoSourceService', () => {
  let service: ThesOrTaxoSourceService;
  let thesService: { getThesaurus: ReturnType<typeof vi.fn> };
  let taxoService: { getNodeFromKey: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    thesService = { getThesaurus: vi.fn() };
    taxoService = { getNodeFromKey: vi.fn() };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    TestBed.configureTestingModule({
      providers: [
        { provide: ThesaurusService, useValue: thesService },
        { provide: TaxoStoreService, useValue: taxoService },
      ],
    });
    service = TestBed.inject(ThesOrTaxoSourceService);
  });

  afterEach(() => vi.restoreAllMocks());

  it('needs no backend service until data is requested', () => {
    TestBed.resetTestingModule();
    // no ThesaurusService nor TaxoStoreService (nor HttpClient) provided
    TestBed.configureTestingModule({});
    const lazy = TestBed.inject(ThesOrTaxoSourceService);
    expect(lazy).toBeTruthy();
    lazy.setTaxoNodeLabel('tree', 'k', 'K');
    lazy.clearCache();
  });

  it('gets thesaurus entries, asking for an empty one if not found', async () => {
    thesService.getThesaurus.mockReturnValue(
      of({ id: 't@en', entries: [{ id: 'a', value: 'A' }] }),
    );
    const entries = await firstValueFrom(service.getThesaurusEntries('t@en'));
    expect(entries).toEqual([{ id: 'a', value: 'A' }]);
    expect(thesService.getThesaurus).toHaveBeenCalledWith('t@en', true);
  });

  it('caches thesaurus entries', async () => {
    thesService.getThesaurus.mockReturnValue(
      of({ id: 't@en', entries: [{ id: 'a', value: 'A' }] }),
    );
    await firstValueFrom(service.getThesaurusEntries('t@en'));
    await firstValueFrom(service.getThesaurusEntries('t@en'));
    expect(thesService.getThesaurus).toHaveBeenCalledTimes(1);
  });

  it('resolves a thesaurus alias', async () => {
    thesService.getThesaurus.mockImplementation((id: string) =>
      id === 'alias@en'
        ? of({ id, targetId: 'target@en' })
        : of({ id, entries: [{ id: 'x', value: 'X' }] }),
    );
    const entries = await firstValueFrom(service.getThesaurusEntries('alias@en'));
    expect(entries).toEqual([{ id: 'x', value: 'X' }]);
    expect(thesService.getThesaurus).toHaveBeenCalledWith('target@en', true);
  });

  it('returns no entries on error without caching', async () => {
    thesService.getThesaurus.mockReturnValueOnce(
      throwError(() => new Error('boom')),
    );
    expect(await firstValueFrom(service.getThesaurusEntries('t@en'))).toEqual([]);

    thesService.getThesaurus.mockReturnValue(
      of({ id: 't@en', entries: [{ id: 'a', value: 'A' }] }),
    );
    expect(await firstValueFrom(service.getThesaurusEntries('t@en'))).toEqual([
      { id: 'a', value: 'A' },
    ]);
    expect(thesService.getThesaurus).toHaveBeenCalledTimes(2);
  });

  it('gets and caches taxonomy node labels', async () => {
    taxoService.getNodeFromKey.mockReturnValue(of({ key: 'k', label: 'K' }));
    expect(await firstValueFrom(service.getTaxoNodeLabel('tree', 'k'))).toBe('K');
    expect(await firstValueFrom(service.getTaxoNodeLabel('tree', 'k'))).toBe('K');
    expect(taxoService.getNodeFromKey).toHaveBeenCalledTimes(1);
    expect(taxoService.getNodeFromKey).toHaveBeenCalledWith('tree', 'k');
  });

  it('returns null for a missing taxonomy node', async () => {
    taxoService.getNodeFromKey.mockReturnValue(of(null));
    expect(await firstValueFrom(service.getTaxoNodeLabel('tree', 'k'))).toBeNull();
  });

  it('uses labels stored via setTaxoNodeLabel', async () => {
    service.setTaxoNodeLabel('tree', 'k', 'Known');
    expect(await firstValueFrom(service.getTaxoNodeLabel('tree', 'k'))).toBe(
      'Known',
    );
    expect(taxoService.getNodeFromKey).not.toHaveBeenCalled();
  });

  it('clears the cache', async () => {
    thesService.getThesaurus.mockReturnValue(of({ id: 't', entries: [] }));
    taxoService.getNodeFromKey.mockReturnValue(of({ key: 'k', label: 'K' }));
    await firstValueFrom(service.getThesaurusEntries('t'));
    await firstValueFrom(service.getTaxoNodeLabel('tree', 'k'));

    service.clearCache('thesauri');
    await firstValueFrom(service.getThesaurusEntries('t'));
    await firstValueFrom(service.getTaxoNodeLabel('tree', 'k'));
    expect(thesService.getThesaurus).toHaveBeenCalledTimes(2);
    expect(taxoService.getNodeFromKey).toHaveBeenCalledTimes(1);

    service.clearCache();
    await firstValueFrom(service.getTaxoNodeLabel('tree', 'k'));
    expect(taxoService.getNodeFromKey).toHaveBeenCalledTimes(2);
  });
});
