import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { AppRepository } from '@myrmidon/cadmus-state';
import { ExportedSegment, AnnotatedTextRange } from '@myrmidon/cadmus-api';
import { LayerPartInfo, Thesaurus } from '@myrmidon/cadmus-core';

import { TextSegmentsViewComponent } from './text-segments-view.component';
import { DecoratedLayerPartInfo } from '../text-preview/text-preview.component';
import { MiniBarChartItem } from '../mini-bar-chart/mini-bar-chart.component';

function buildSegment(overrides?: Partial<ExportedSegment>): ExportedSegment {
  return { sourceId: 0, text: 'abc', ...overrides };
}

function buildRange(overrides?: Partial<AnnotatedTextRange>): AnnotatedTextRange {
  return { start: 0, end: 1, ...overrides };
}

function buildLayer(
  overrides?: Partial<DecoratedLayerPartInfo>,
): DecoratedLayerPartInfo {
  const base: LayerPartInfo = {
    id: 'layer1',
    itemId: 'item1',
    typeId: 'fr.it.vedph.comment',
    roleId: 'fr.it.vedph.comment',
    fragmentCount: 1,
    isAbsent: false,
    timeCreated: new Date(0),
    creatorId: 'zeus',
    timeModified: new Date(0),
    userId: 'zeus',
  };
  return { ...base, color: '#ff0000', ...overrides };
}

describe('TextSegmentsViewComponent', () => {
  let component: TextSegmentsViewComponent;
  let fixture: ComponentFixture<TextSegmentsViewComponent>;
  let appRepository: { getTypeThesaurus: ReturnType<typeof vi.fn> };

  async function createFixture(thesaurus?: Thesaurus): Promise<void> {
    TestBed.resetTestingModule();
    appRepository = {
      getTypeThesaurus: vi.fn().mockReturnValue(thesaurus),
    };

    await TestBed.configureTestingModule({
      imports: [TextSegmentsViewComponent],
      providers: [{ provide: AppRepository, useValue: appRepository }],
    }).compileComponents();

    fixture = TestBed.createComponent(TextSegmentsViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await createFixture();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default chartOptions to zoomAndPan enabled', () => {
    expect(component.chartOptions).toEqual({ zoomAndPan: true });
  });

  //#region rows() / buildRows
  it('rows() should be empty for no segments', () => {
    expect(component.rows()).toEqual([]);
  });

  it('should put all segments in a single row when none mark end-of-line', () => {
    fixture.componentRef.setInput('segments', [
      buildSegment({ sourceId: 0 }),
      buildSegment({ sourceId: 1 }),
    ]);
    fixture.detectChanges();

    expect(component.rows().length).toBe(1);
    expect(component.rows()[0]).toHaveLength(2);
  });

  it('should start a new row after a segment with the eol-tail feature', () => {
    fixture.componentRef.setInput('segments', [
      buildSegment({ sourceId: 0, features: [{ name: 'eol-tail' }] }),
      buildSegment({ sourceId: 1 }),
      buildSegment({ sourceId: 2, features: [{ name: 'eol-tail' }] }),
    ]);
    fixture.detectChanges();

    const rows = component.rows();
    expect(rows.length).toBe(2);
    expect(rows[0]).toHaveLength(1);
    expect(rows[1]).toHaveLength(2);
  });

  it('should assign a sequential _uniqueId across all segments regardless of row', () => {
    fixture.componentRef.setInput('segments', [
      buildSegment({ sourceId: 0, features: [{ name: 'eol-tail' }] }),
      buildSegment({ sourceId: 1 }),
      buildSegment({ sourceId: 2 }),
    ]);
    fixture.detectChanges();

    const flat = component.rows().flat();
    expect(flat.map((s: any) => s._uniqueId)).toEqual([0, 1, 2]);
  });
  //#endregion

  //#region chart items (addChartItems, private, exercised through rows())
  describe('chart items attached to each segment', () => {
    it('should attach a chart item using the thesaurus label when the fragment id matches a layer', async () => {
      await createFixture({
        id: 'model-types@en',
        entries: [{ id: 'fr.it.vedph.comment', value: 'Comment' }],
      });
      const layer = buildLayer();
      fixture.componentRef.setInput('layers', [layer]);
      fixture.componentRef.setInput('segments', [
        buildSegment({
          payloads: [
            buildRange({
              fragmentIds: ['fr.it.vedph.comment:fr.it.vedph.comment@0'],
            }),
          ],
        }),
      ]);
      fixture.detectChanges();

      expect((component.rows()[0][0] as any).chartItems).toEqual([
        {
          id: 'fr.it.vedph.comment:fr.it.vedph.comment@0',
          label: 'Comment',
          color: '#ff0000',
          value: 1,
        },
      ]);
    });

    it('should fall back to the raw roleId as the label when it is not in the thesaurus', () => {
      const layer = buildLayer({ roleId: 'unknown-role', color: undefined });
      fixture.componentRef.setInput('layers', [layer]);
      fixture.componentRef.setInput('segments', [
        buildSegment({
          payloads: [
            buildRange({
              fragmentIds: [`${layer.typeId}:unknown-role@0`],
            }),
          ],
        }),
      ]);
      fixture.detectChanges();

      const chartItems = (component.rows()[0][0] as any)
        .chartItems as MiniBarChartItem[];
      expect(chartItems[0].label).toBe('unknown-role');
      expect(chartItems[0].color).toBe('transparent');
    });

    it('should leave chartItems undefined when no fragment id matches a layer', () => {
      fixture.componentRef.setInput('layers', [buildLayer()]);
      fixture.componentRef.setInput('segments', [
        buildSegment({
          payloads: [buildRange({ fragmentIds: ['other.type:other.role@0'] })],
        }),
      ]);
      fixture.detectChanges();

      expect((component.rows()[0][0] as any).chartItems).toBeUndefined();
    });

    it('should leave chartItems undefined when the segment has no payloads', () => {
      fixture.componentRef.setInput('layers', [buildLayer()]);
      fixture.componentRef.setInput('segments', [buildSegment()]);
      fixture.detectChanges();

      expect((component.rows()[0][0] as any).chartItems).toBeUndefined();
    });

    it('should leave chartItems undefined when there are no layers set', () => {
      fixture.componentRef.setInput('segments', [
        buildSegment({
          payloads: [
            buildRange({
              fragmentIds: ['fr.it.vedph.comment:fr.it.vedph.comment@0'],
            }),
          ],
        }),
      ]);
      fixture.detectChanges();

      expect((component.rows()[0][0] as any).chartItems).toBeUndefined();
    });
  });
  //#endregion

  //#region getSegmentColor
  describe('getSegmentColor', () => {
    it('should return the color of the layer matching the first fragment id', () => {
      const layer = buildLayer({ color: '#abcdef' });
      fixture.componentRef.setInput('layers', [layer]);
      fixture.detectChanges();

      const segment = buildSegment({
        payloads: [
          buildRange({ fragmentIds: [`${layer.typeId}:${layer.roleId}@0`] }),
        ],
      });
      expect(component.getSegmentColor(segment)).toBe('#abcdef');
    });

    it('should return transparent when the matching layer has no color', () => {
      const layer = buildLayer({ color: undefined });
      fixture.componentRef.setInput('layers', [layer]);
      fixture.detectChanges();

      const segment = buildSegment({
        payloads: [
          buildRange({ fragmentIds: [`${layer.typeId}:${layer.roleId}@0`] }),
        ],
      });
      expect(component.getSegmentColor(segment)).toBe('transparent');
    });

    it('should return transparent when no fragment id matches any layer', () => {
      fixture.componentRef.setInput('layers', [buildLayer()]);
      fixture.detectChanges();

      const segment = buildSegment({
        payloads: [buildRange({ fragmentIds: ['other.type:other.role@0'] })],
      });
      expect(component.getSegmentColor(segment)).toBe('transparent');
    });

    it('should return transparent when there are no layers set', () => {
      const segment = buildSegment({
        payloads: [buildRange({ fragmentIds: ['a:b@0'] })],
      });
      expect(component.getSegmentColor(segment)).toBe('transparent');
    });

    it('should return transparent when the segment has no payloads', () => {
      fixture.componentRef.setInput('layers', [buildLayer()]);
      fixture.detectChanges();
      expect(component.getSegmentColor(buildSegment())).toBe('transparent');
    });
  });
  //#endregion

  //#region outputs
  describe('onSegmentClick / onChartItemClicked', () => {
    it('onSegmentClick should emit segmentClick with the given segment', () => {
      const spy = vi.fn();
      component.segmentClick.subscribe(spy);
      const segment = buildSegment();

      component.onSegmentClick(segment);

      expect(spy).toHaveBeenCalledWith(segment);
    });

    it('onChartItemClicked should emit fragmentPick with the chart item id', () => {
      const spy = vi.fn();
      component.fragmentPick.subscribe(spy);

      component.onChartItemClicked({
        id: 'fr1',
        label: 'l',
        value: 1,
        color: '#fff',
      });

      expect(spy).toHaveBeenCalledWith('fr1');
    });
  });
  //#endregion
});
