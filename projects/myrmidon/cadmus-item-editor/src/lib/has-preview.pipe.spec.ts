import { HasPreviewPipe } from './has-preview.pipe';
import { Part } from '@myrmidon/cadmus-core';

function makePart(overrides?: Partial<Part>): Part {
  return {
    id: 'p1',
    itemId: 'item1',
    typeId: 'it.vedph.note',
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    ...overrides,
  };
}

describe('HasPreviewPipe', () => {
  let pipe: HasPreviewPipe;

  beforeEach(() => {
    pipe = new HasPreviewPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return false for a falsy part', () => {
    expect(pipe.transform(null, [], [])).toBe(false);
    expect(pipe.transform(undefined, [], [])).toBe(false);
  });

  describe('base-text role', () => {
    it('should return true when the typeId is in the flatteners keys', () => {
      const part = makePart({ typeId: 'it.vedph.token-text', roleId: 'base-text' });
      expect(pipe.transform(part, [], ['it.vedph.token-text'])).toBe(true);
    });

    it('should return true when the typeId is in the renderers keys', () => {
      const part = makePart({ typeId: 'it.vedph.token-text', roleId: 'base-text' });
      expect(pipe.transform(part, ['it.vedph.token-text'], [])).toBe(true);
    });

    it('should return false when the typeId is in neither list', () => {
      const part = makePart({ typeId: 'it.vedph.token-text', roleId: 'base-text' });
      expect(pipe.transform(part, ['other'], ['other'])).toBe(false);
    });

    it('should return false when both key lists are null', () => {
      const part = makePart({ typeId: 'it.vedph.token-text', roleId: 'base-text' });
      expect(pipe.transform(part, null, null)).toBe(false);
    });
  });

  describe('non base-text parts', () => {
    it('should match by typeId alone when there is no roleId', () => {
      const part = makePart({ typeId: 'it.vedph.note' });
      expect(pipe.transform(part, ['it.vedph.note'], [])).toBe(true);
    });

    it('should match by "typeId|roleId" when a roleId is present', () => {
      const part = makePart({
        typeId: 'it.vedph.token-text-layer',
        roleId: 'fr.it.vedph.comment',
      });
      expect(
        pipe.transform(
          part,
          ['it.vedph.token-text-layer|fr.it.vedph.comment'],
          []
        )
      ).toBe(true);
    });

    it('should not match by typeId alone when a roleId is present', () => {
      const part = makePart({
        typeId: 'it.vedph.token-text-layer',
        roleId: 'fr.it.vedph.comment',
      });
      expect(pipe.transform(part, ['it.vedph.token-text-layer'], [])).toBe(
        false
      );
    });

    it('should ignore the flatteners keys entirely', () => {
      const part = makePart({ typeId: 'it.vedph.note' });
      expect(pipe.transform(part, [], ['it.vedph.note'])).toBe(false);
    });

    it('should return false when rKeys is null', () => {
      const part = makePart({ typeId: 'it.vedph.note' });
      expect(pipe.transform(part, null, [])).toBe(false);
    });
  });
});
