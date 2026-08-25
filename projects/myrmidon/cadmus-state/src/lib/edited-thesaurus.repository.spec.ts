import { of, throwError } from 'rxjs';

import { EditedThesaurusRepository } from './edited-thesaurus.repository';
import { ThesaurusService } from '@myrmidon/cadmus-api';
import { Thesaurus } from '@myrmidon/cadmus-core';

function createRepository(): {
  repo: EditedThesaurusRepository;
  thesaurusService: {
    getThesaurus: ReturnType<typeof vi.fn>;
    addThesaurus: ReturnType<typeof vi.fn>;
  };
} {
  const thesaurusService = {
    getThesaurus: vi.fn(),
    addThesaurus: vi.fn(),
  };
  const repo = new EditedThesaurusRepository(
    thesaurusService as unknown as ThesaurusService
  );
  return { repo, thesaurusService };
}

function collectLoadingHistory(repo: EditedThesaurusRepository): boolean[] {
  const history: boolean[] = [];
  repo.loading$.subscribe((v) => history.push(v));
  return history;
}

describe('EditedThesaurusRepository', () => {
  it('should be created with an undefined thesaurus', () => {
    const { repo } = createRepository();
    expect(repo).toBeTruthy();
    expect(repo.getThesaurus()).toBeUndefined();
  });

  describe('load with an ID', () => {
    it('should load the thesaurus and toggle loading true then false', () => {
      const thesaurus: Thesaurus = { id: 't1', entries: [] };
      const { repo, thesaurusService } = createRepository();
      thesaurusService.getThesaurus.mockReturnValue(of(thesaurus));
      const loadingHistory = collectLoadingHistory(repo);

      repo.load('t1');

      expect(thesaurusService.getThesaurus).toHaveBeenCalledWith('t1', true);
      expect(repo.getThesaurus()).toEqual(thesaurus);
      expect(loadingHistory).toEqual([false, true, false]);
    });

    it('should reset loading to false even when the request fails', () => {
      const { repo, thesaurusService } = createRepository();
      thesaurusService.getThesaurus.mockReturnValue(
        throwError(() => new Error('boom'))
      );
      const loadingHistory = collectLoadingHistory(repo);

      repo.load('missing');

      expect(loadingHistory).toEqual([false, true, false]);
      expect(repo.getThesaurus()).toBeUndefined();
    });
  });

  describe('load without an ID', () => {
    it('should create a blank thesaurus and reset loading to false', () => {
      const { repo } = createRepository();
      const loadingHistory = collectLoadingHistory(repo);

      repo.load();

      expect(repo.getThesaurus()).toEqual({
        id: '',
        language: 'en',
        entries: [],
      });
      // regression test: loading must not get stuck at true when
      // creating a brand new thesaurus (no id)
      expect(loadingHistory).toEqual([false, true, false]);
    });
  });

  describe('save', () => {
    it('should save and then reload the thesaurus by its returned ID', async () => {
      const saved: Thesaurus = { id: 't1', entries: [] };
      const { repo, thesaurusService } = createRepository();
      thesaurusService.addThesaurus.mockReturnValue(of(saved));
      thesaurusService.getThesaurus.mockReturnValue(of(saved));

      const result = await repo.save({ id: '', entries: [] });

      expect(result).toEqual(saved);
      expect(thesaurusService.getThesaurus).toHaveBeenCalledWith('t1', true);
      expect(repo.getThesaurus()).toEqual(saved);
    });

    it('should toggle saving true then false around the save', async () => {
      const saved: Thesaurus = { id: 't1', entries: [] };
      const { repo, thesaurusService } = createRepository();
      thesaurusService.addThesaurus.mockReturnValue(of(saved));
      thesaurusService.getThesaurus.mockReturnValue(of(saved));
      const savingHistory: boolean[] = [];
      repo.saving$.subscribe((v) => savingHistory.push(v));

      await repo.save({ id: '', entries: [] });

      expect(savingHistory).toEqual([false, true, false]);
    });

    it('should reject and reset saving to false when the request fails', async () => {
      const { repo, thesaurusService } = createRepository();
      thesaurusService.addThesaurus.mockReturnValue(
        throwError(() => new Error('boom'))
      );
      const savingHistory: boolean[] = [];
      repo.saving$.subscribe((v) => savingHistory.push(v));

      await expect(repo.save({ id: '', entries: [] })).rejects.toBeTruthy();
      expect(savingHistory).toEqual([false, true, false]);
    });
  });
});
