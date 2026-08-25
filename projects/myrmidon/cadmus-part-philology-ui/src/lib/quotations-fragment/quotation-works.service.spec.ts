import { TestBed } from '@angular/core/testing';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { QuotationWorksService } from './quotation-works.service';

describe('QuotationWorksService', () => {
  let service: QuotationWorksService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QuotationWorksService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  //#region buildDictionary
  describe('buildDictionary', () => {
    it('should return an empty record for an empty/undefined entries array', () => {
      expect(service.buildDictionary([])).toEqual({});
      expect(service.buildDictionary(undefined as any)).toEqual({});
    });

    it('should group entries by author (id up to the first dot)', () => {
      const entries: ThesaurusEntry[] = [
        { id: 'Verg.', value: 'Vergilius' },
        { id: 'Verg.ecl.', value: 'Eclogae' },
        { id: 'Verg.aen.', value: 'Aeneis' },
        { id: 'Ov.', value: 'Ovidius' },
      ];

      const dict = service.buildDictionary(entries);

      expect(Object.keys(dict).sort()).toEqual(['Ov', 'Verg']);
      expect(dict['Verg']).toEqual([entries[0], entries[1], entries[2]]);
      expect(dict['Ov']).toEqual([entries[3]]);
    });

    it('should treat an id with no dot as a bare author key', () => {
      const entries: ThesaurusEntry[] = [{ id: 'Hom', value: 'Homerus' }];
      const dict = service.buildDictionary(entries);
      expect(dict['Hom']).toEqual([entries[0]]);
    });

    it('should keep dots after the first as part of the work id (only the first dot splits)', () => {
      const entries: ThesaurusEntry[] = [
        { id: 'Verg.', value: 'Vergilius' },
        { id: 'Verg.ecl.1.', value: 'Eclogae I' },
      ];
      const dict = service.buildDictionary(entries);
      // both entries fall under the 'Verg' author key, since only the
      // first dot is used to split author from work
      expect(dict['Verg'].map((e) => e.id)).toEqual([
        'Verg.',
        'Verg.ecl.1.',
      ]);
    });
  });
  //#endregion

  //#region collectAuthors
  describe('collectAuthors', () => {
    it('should return null for an undefined dictionary', () => {
      expect(service.collectAuthors(undefined)).toBeNull();
    });

    it('should return null for an empty dictionary', () => {
      expect(service.collectAuthors({})).toBeNull();
    });

    it('should return one entry per author, using the first entry of each group as its display value', () => {
      const entries: ThesaurusEntry[] = [
        { id: 'Verg.', value: 'Vergilius' },
        { id: 'Verg.ecl.', value: 'Eclogae' },
        { id: 'Ov.', value: 'Ovidius' },
      ];
      const dict = service.buildDictionary(entries);

      const authors = service.collectAuthors(dict);

      expect(authors).toEqual([
        { id: 'Verg', value: 'Vergilius' },
        { id: 'Ov', value: 'Ovidius' },
      ]);
    });
  });
  //#endregion
});
