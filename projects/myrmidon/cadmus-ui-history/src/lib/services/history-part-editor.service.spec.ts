import { of } from 'rxjs';

import { ThesaurusService } from '@myrmidon/cadmus-api';
import { Part } from '@myrmidon/cadmus-core';

import {
  createHistoryPartEditorService,
  HISTORY_READONLY_MESSAGE,
} from './history-part-editor.service';

function makePart(overrides?: Partial<Part>): Part {
  return {
    id: 'p1',
    itemId: 'i1',
    typeId: 'it.vedph.note',
    timeCreated: new Date(0),
    creatorId: 'hera',
    timeModified: new Date(0),
    userId: 'zeus',
    ...overrides,
  };
}

describe('createHistoryPartEditorService', () => {
  function mockThesaurusService() {
    return {
      getScopedId: vi.fn((id: string, scope?: string) =>
        scope ? `${id.replace('@en', '')}.${scope}@en` : id,
      ),
      getThesauriSet: vi.fn((ids: string[]) =>
        of(Object.fromEntries(ids.map((id) => [id, { id, entries: [] }]))),
      ),
    };
  }

  it('should load the version (not the routed part) without thesauri', async () => {
    const ts = mockThesaurusService();
    const part = makePart({ text: 'old' } as any);
    const service = createHistoryPartEditorService(
      part,
      ts as unknown as ThesaurusService,
    );

    const data = await service.load({
      itemId: 'i1',
      typeId: 'it.vedph.note',
      partId: 'p1',
      roleId: null,
    });

    expect((data!.value as any).text).toBe('old');
    // a copy, so that editors cannot change the version
    expect(data!.value).not.toBe(part);
    expect(data!.thesauri).toEqual({});
  });

  it('should load the requested thesauri with the version scope', async () => {
    const ts = mockThesaurusService();
    const service = createHistoryPartEditorService(
      makePart({ thesaurusScope: 'old' }),
      ts as unknown as ThesaurusService,
    );

    const data = await service.load(
      { itemId: 'i1', typeId: 'it.vedph.note', partId: 'p1', roleId: null },
      ['note-tags@en'],
    );

    expect(ts.getScopedId).toHaveBeenCalledWith('note-tags@en', 'old');
    expect(Object.keys(data!.thesauri)).toEqual(['note-tags.old@en']);
  });

  it('should refuse to save', async () => {
    const service = createHistoryPartEditorService(
      makePart(),
      mockThesaurusService() as unknown as ThesaurusService,
    );
    await expect(service.save(makePart())).rejects.toEqual(
      expect.objectContaining({ message: HISTORY_READONLY_MESSAGE }),
    );
  });
});
