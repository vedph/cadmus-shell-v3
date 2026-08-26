import { of } from 'rxjs';

import { FacetDefinition } from '@myrmidon/cadmus-core';
import { FacetModelSettings, ThesaurusService } from '@myrmidon/cadmus-api';

import { FacetDefinitionValidatorService } from './facet-definition-validator.service';

function makeFacet(overrides?: Partial<FacetDefinition>): FacetDefinition {
  return {
    id: 'f1',
    label: 'Facet 1',
    colorKey: 'ff0000',
    description: 'desc',
    partDefinitions: [{ typeId: 'p1', name: 'Part 1' }],
    ...overrides,
  };
}

describe('FacetDefinitionValidatorService', () => {
  let thesaurusService: { getThesaurusIds: ReturnType<typeof vi.fn> };
  let service: FacetDefinitionValidatorService;

  beforeEach(() => {
    thesaurusService = { getThesaurusIds: vi.fn().mockReturnValue(of([])) };
    service = new FacetDefinitionValidatorService(
      thesaurusService as unknown as ThesaurusService,
    );
  });

  function validateSync(
    facets: FacetDefinition[],
    settings?: FacetModelSettings,
  ) {
    let result: any;
    service.validate(facets, settings).subscribe((r) => (result = r));
    return result;
  }

  it('should return no issues for a single valid facet', () => {
    const result = validateSync([makeFacet()]);
    expect(result.issues).toEqual([]);
    expect(result.hasErrors).toBe(false);
    expect(result.hasWarnings).toBe(false);
    expect(result.hasInfos).toBe(false);
  });

  it('should not call the thesaurus service when no settings are given', () => {
    validateSync([makeFacet()]);
    expect(thesaurusService.getThesaurusIds).not.toHaveBeenCalled();
  });

  describe('facet-level checks', () => {
    it('should report an error for an empty facet ID', () => {
      const result = validateSync([makeFacet({ id: '' })]);
      expect(result.hasErrors).toBe(true);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          message: 'A facet has an empty ID.',
        }),
      );
    });

    it('should report a warning for the placeholder ID "new"', () => {
      const result = validateSync([makeFacet({ id: 'new' })]);
      expect(result.hasWarnings).toBe(true);
      expect(result.hasErrors).toBe(false);
    });

    it('should report an error for duplicate facet IDs', () => {
      const result = validateSync([
        makeFacet({ id: 'f1', label: 'A' }),
        makeFacet({ id: 'f1', label: 'B' }),
      ]);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          message: 'Duplicate facet ID: "f1".',
        }),
      );
    });

    it('should report an error for duplicate facet labels', () => {
      const result = validateSync([
        makeFacet({ id: 'f1', label: 'Same' }),
        makeFacet({ id: 'f2', label: 'Same' }),
      ]);
      expect(result.hasErrors).toBe(true);
      expect(
        result.issues.some((i: any) => i.message.includes('Duplicate facet label')),
      ).toBe(true);
    });

    it('should report an info for duplicate facet colors', () => {
      const result = validateSync([
        makeFacet({ id: 'f1', label: 'A', colorKey: 'aabbcc' }),
        makeFacet({ id: 'f2', label: 'B', colorKey: 'aabbcc' }),
      ]);
      expect(result.hasInfos).toBe(true);
      expect(result.hasErrors).toBe(false);
    });

    it('should report an info for duplicate facet descriptions', () => {
      const result = validateSync([
        makeFacet({ id: 'f1', label: 'A', description: 'same' }),
        makeFacet({ id: 'f2', label: 'B', description: 'same' }),
      ]);
      expect(result.hasInfos).toBe(true);
    });

    it('should report an error for a facet with no part definitions', () => {
      const result = validateSync([makeFacet({ partDefinitions: [] })]);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          message: 'facet "f1" has no part definitions.',
        }),
      );
    });
  });

  describe('part-level checks', () => {
    it('should report an error for duplicate typeId+roleId within a facet', () => {
      const result = validateSync([
        makeFacet({
          partDefinitions: [
            { typeId: 'p1', roleId: 'r1', name: 'A' },
            { typeId: 'p1', roleId: 'r1', name: 'B' },
          ],
        }),
      ]);
      expect(result.hasErrors).toBe(true);
      expect(
        result.issues.some((i: any) => i.message.includes('Duplicate part')),
      ).toBe(true);
    });

    it('should NOT flag the same typeId with and without a roleId as duplicates', () => {
      const result = validateSync([
        makeFacet({
          partDefinitions: [
            { typeId: 'p1', name: 'A' },
            { typeId: 'p1', roleId: 'r1', name: 'B' },
          ],
        }),
      ]);
      expect(result.hasErrors).toBe(false);
    });

    it('should report an info for duplicate part colors within a facet', () => {
      const result = validateSync([
        makeFacet({
          partDefinitions: [
            { typeId: 'p1', name: 'A', colorKey: 'aabbcc' },
            { typeId: 'p2', name: 'B', colorKey: 'aabbcc' },
          ],
        }),
      ]);
      expect(result.hasInfos).toBe(true);
    });

    it('should report an info for duplicate part descriptions within a facet', () => {
      const result = validateSync([
        makeFacet({
          partDefinitions: [
            { typeId: 'p1', name: 'A', description: 'same' },
            { typeId: 'p2', name: 'B', description: 'same' },
          ],
        }),
      ]);
      expect(result.hasInfos).toBe(true);
    });
  });

  describe('thesaurus coverage checks', () => {
    const settings: FacetModelSettings = {
      parts: {
        p1: { thesauriIds: ['*required-thes', 'optional-thes'] },
      },
      fragments: {
        fr1: { thesauriIds: ['*required-frag-thes'] },
      },
    };

    it('should report an error for a missing required thesaurus', () => {
      thesaurusService.getThesaurusIds.mockReturnValue(of([]));
      const result = validateSync([makeFacet()], settings);
      expect(result.hasErrors).toBe(true);
      expect(
        result.issues.some((i: any) =>
          i.message.includes('requires thesaurus "required-thes"'),
        ),
      ).toBe(true);
    });

    it('should report an info for a missing optional thesaurus', () => {
      thesaurusService.getThesaurusIds.mockReturnValue(
        of(['required-thes@en', 'required-frag-thes@en']),
      );
      const result = validateSync([makeFacet()], settings);
      expect(result.hasErrors).toBe(false);
      expect(
        result.issues.some((i: any) =>
          i.message.includes('optional thesaurus "optional-thes"'),
        ),
      ).toBe(true);
    });

    it('should strip the @language suffix before comparing thesaurus IDs', () => {
      thesaurusService.getThesaurusIds.mockReturnValue(
        of(['required-thes@en', 'optional-thes@it', 'required-frag-thes@en']),
      );
      const result = validateSync([makeFacet()], settings);
      expect(result.issues).toEqual([]);
    });

    it('should check fragment thesauri only when settings.fragments is present', () => {
      const partsOnly: FacetModelSettings = { parts: settings.parts };
      thesaurusService.getThesaurusIds.mockReturnValue(of(['required-thes@en']));
      const result = validateSync([makeFacet()], partsOnly);
      // only the optional-thes info issue should remain; no fragment checks ran
      expect(
        result.issues.every((i: any) => !i.message.includes('Fragment')),
      ).toBe(true);
    });
  });
});
