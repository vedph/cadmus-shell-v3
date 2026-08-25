import { TestBed } from '@angular/core/testing';

import { LibraryRouteService } from './library-route.service';
import { PartEditorKeys } from '../models';

const partEditorKeys: PartEditorKeys = {
  'it.vedph.note': {
    part: 'general',
  },
  'it.vedph.token-text': {
    part: 'general',
    fragments: {
      'fr.it.vedph.comment': 'comment-fragment',
      'fr.it.vedph.orthography': 'orthography-fragment',
    },
  },
};

function createService(): LibraryRouteService {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: 'partEditorKeys',
        useValue: partEditorKeys,
      },
    ],
  });
  return TestBed.inject(LibraryRouteService);
}

describe('LibraryRouteServiceService', () => {
  it('should be created', () => {
    expect(createService()).toBeTruthy();
  });

  describe('stripFragmentRoleId', () => {
    it('should strip the fragment role suffix after the last colon', () => {
      const service = createService();
      expect(
        service.stripFragmentRoleId('fr.it.vedph.comment:scholarly')
      ).toBe('fr.it.vedph.comment');
    });

    it('should strip only after the last colon when there are several', () => {
      const service = createService();
      expect(service.stripFragmentRoleId('a:b:c')).toBe('a:b');
    });

    it('should return the role ID unchanged when there is no colon', () => {
      const service = createService();
      expect(service.stripFragmentRoleId('fr.it.vedph.comment')).toBe(
        'fr.it.vedph.comment'
      );
    });
  });

  describe('getFragmentTypeAndRole', () => {
    it('should return null when roleId is not provided', () => {
      const service = createService();
      expect(service.getFragmentTypeAndRole()).toBeNull();
    });

    it('should return null when roleId does not start with "fr."', () => {
      const service = createService();
      expect(service.getFragmentTypeAndRole('scholarly')).toBeNull();
    });

    it('should return frTypeId with undefined frRoleId when there is no colon', () => {
      const service = createService();
      expect(service.getFragmentTypeAndRole('fr.it.vedph.comment')).toEqual({
        frTypeId: 'fr.it.vedph.comment',
        frRoleId: undefined,
      });
    });

    it('should split frTypeId and frRoleId at the colon', () => {
      const service = createService();
      expect(
        service.getFragmentTypeAndRole('fr.it.vedph.comment:scholarly')
      ).toEqual({
        frTypeId: 'fr.it.vedph.comment',
        frRoleId: 'scholarly',
      });
    });
  });

  describe('getEditorKeyFromPartType', () => {
    it('should return the "default" key for an unmapped type', () => {
      const service = createService();
      expect(service.getEditorKeyFromPartType('unknown')).toEqual({
        partKey: 'default',
      });
    });

    it('should return the mapped part key when no role is given', () => {
      const service = createService();
      expect(service.getEditorKeyFromPartType('it.vedph.note')).toEqual({
        partKey: 'general',
      });
    });

    it('should also resolve the fragment key when a role is given', () => {
      const service = createService();
      expect(
        service.getEditorKeyFromPartType(
          'it.vedph.token-text',
          'fr.it.vedph.comment:scholarly'
        )
      ).toEqual({
        partKey: 'general',
        frKey: 'comment-fragment',
      });
    });

    it('should not throw when the mapped part type has no fragments map', () => {
      const service = createService();
      expect(() =>
        service.getEditorKeyFromPartType('it.vedph.note', 'fr.it.vedph.comment')
      ).not.toThrow();
      expect(
        service.getEditorKeyFromPartType('it.vedph.note', 'fr.it.vedph.comment')
      ).toEqual({ partKey: 'general', frKey: undefined });
    });
  });

  describe('decomposeEditorKey', () => {
    it('should split a "part fragment" key on the space', () => {
      const service = createService();
      expect(service.decomposeEditorKey('general comment-fragment')).toEqual({
        partKey: 'general',
        frKey: 'comment-fragment',
      });
    });

    it('should use the same value for both parts when there is no space', () => {
      const service = createService();
      expect(service.decomposeEditorKey('general')).toEqual({
        partKey: 'general',
        frKey: 'general',
      });
    });
  });

  describe('buildPartEditorRoute', () => {
    it('should build a part editor route and pass roleId through as rid', () => {
      const service = createService();
      const result = service.buildPartEditorRoute(
        'item1',
        'part1',
        'it.vedph.note',
        'some-role'
      );
      expect(result.route).toBe('/items/item1/general/it.vedph.note/part1');
      expect(result.rid).toBe('some-role');
    });

    it('should fall back to the "default" group for an unmapped type', () => {
      const service = createService();
      const result = service.buildPartEditorRoute(
        'item1',
        'part1',
        'unknown'
      );
      expect(result.route).toBe('/items/item1/default/unknown/part1');
      expect(result.rid).toBeUndefined();
    });
  });

  describe('buildFragmentEditorRoute', () => {
    it('should build a fragment editor route from a role with a colon', () => {
      const service = createService();
      const result = service.buildFragmentEditorRoute(
        [],
        'item1',
        'part1',
        'it.vedph.token-text',
        'fr.it.vedph.comment:scholarly',
        '1.1'
      );
      expect(result.route).toBe(
        '/items/item1/comment-fragment/fragment/part1/fr.it.vedph.comment/1.1'
      );
      expect(result.rid).toBe('scholarly');
    });

    it('should not throw and should fall back to typeId when roleId is undefined', () => {
      const service = createService();
      const result = service.buildFragmentEditorRoute(
        [],
        'item1',
        'part1',
        'it.vedph.token-text',
        undefined,
        '1.1'
      );
      expect(result.route).toBe(
        '/items/item1/general/fragment/part1/it.vedph.token-text/1.1'
      );
      expect(result.rid).toBeUndefined();
    });
  });
});
