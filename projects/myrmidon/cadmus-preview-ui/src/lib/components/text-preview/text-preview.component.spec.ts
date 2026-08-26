import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError, Subject } from 'rxjs';
import { vi } from 'vitest';

import {
  ItemService,
  PreviewService,
  ExportedSegment,
  RenditionResult,
} from '@myrmidon/cadmus-api';
import { Item, LayerPartInfo } from '@myrmidon/cadmus-core';
import { AppRepository } from '@myrmidon/cadmus-state';

import {
  TextPreviewComponent,
  DecoratedLayerPartInfo,
} from './text-preview.component';
import { PartPreviewSource } from '../part-preview/part-preview.component';

function buildItem(overrides?: Partial<Item>): Item {
  return {
    id: 'item1',
    title: 'Item 1',
    description: '',
    facetId: 'default',
    groupId: '',
    sortKey: 'item1',
    flags: 0,
    timeCreated: new Date(0),
    creatorId: 'zeus',
    timeModified: new Date(0),
    userId: 'zeus',
    ...overrides,
  };
}

function buildLayer(overrides?: Partial<LayerPartInfo>): LayerPartInfo {
  return {
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
    ...overrides,
  };
}

describe('TextPreviewComponent', () => {
  let component: TextPreviewComponent;
  let fixture: ComponentFixture<TextPreviewComponent>;
  let itemService: {
    getItem: ReturnType<typeof vi.fn>;
    getItemLayerInfo: ReturnType<typeof vi.fn>;
  };
  let previewService: {
    getTextSegments: ReturnType<typeof vi.fn>;
    renderFragment: ReturnType<typeof vi.fn>;
  };
  let appRepository: {
    getPartColor: ReturnType<typeof vi.fn>;
    getTypeThesaurus: ReturnType<typeof vi.fn>;
  };
  let snackbar: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    itemService = {
      getItem: vi.fn().mockReturnValue(of(buildItem())),
      getItemLayerInfo: vi.fn().mockReturnValue(of([buildLayer()])),
    };
    previewService = {
      getTextSegments: vi.fn().mockReturnValue(of([] as ExportedSegment[])),
      renderFragment: vi
        .fn()
        .mockReturnValue(of({ result: '<p>fr</p>' } as RenditionResult)),
    };
    // getTypeThesaurus is also required here because the template renders
    // the real child <cadmus-text-segments-view>, whose own constructor
    // calls AppRepository.getTypeThesaurus()
    appRepository = {
      getPartColor: vi.fn().mockReturnValue(undefined),
      getTypeThesaurus: vi.fn().mockReturnValue(undefined),
    };
    snackbar = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [TextPreviewComponent],
      providers: [
        { provide: ItemService, useValue: itemService },
        { provide: PreviewService, useValue: previewService },
        { provide: AppRepository, useValue: appRepository },
        { provide: MatSnackBar, useValue: snackbar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TextPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not load anything when source is undefined', () => {
    expect(itemService.getItem).not.toHaveBeenCalled();
    expect(itemService.getItemLayerInfo).not.toHaveBeenCalled();
    expect(component.item()).toBeUndefined();
    expect(component.layers()).toEqual([]);
    expect(component.segments()).toEqual([]);
  });

  it('should not call any service when source has no partId', () => {
    fixture.componentRef.setInput('source', {
      itemId: 'item1',
      partId: '',
    } as PartPreviewSource);
    fixture.detectChanges();

    expect(itemService.getItem).not.toHaveBeenCalled();
    expect(component.item()).toBeUndefined();
  });

  describe('loading an item and its layers', () => {
    it('should load the item and layers, then default-select "all" and load its segments', () => {
      const layer = buildLayer();
      itemService.getItemLayerInfo.mockReturnValue(of([layer]));
      previewService.getTextSegments.mockReturnValue(
        of([{ sourceId: 0, text: 'a b' }] as ExportedSegment[]),
      );

      fixture.componentRef.setInput('source', {
        itemId: 'item1',
        partId: 'part1',
      } as PartPreviewSource);
      fixture.detectChanges();

      expect(itemService.getItem).toHaveBeenCalledWith('item1', false);
      expect(itemService.getItemLayerInfo).toHaveBeenCalledWith(
        'item1',
        false,
      );
      expect(component.item()?.id).toBe('item1');
      expect(component.layers()).toEqual([layer]);
      expect(component.selectedLayer.value?.id).toBe('all');
      // "all" resolves to every loaded layer's id
      expect(previewService.getTextSegments).toHaveBeenCalledWith('part1', [
        'layer1',
      ]);
      expect(component.busy()).toBe(false);
    });

    it('should replace spaces in segment text with a middle dot', () => {
      previewService.getTextSegments.mockReturnValue(
        of([{ sourceId: 0, text: 'a b c' }] as ExportedSegment[]),
      );
      fixture.componentRef.setInput('source', {
        itemId: 'item1',
        partId: 'part1',
      } as PartPreviewSource);
      fixture.detectChanges();

      expect(component.segments()[0].text).toBe('a\xB7b\xB7c');
    });

    it('should select and load only the requested layer when source.layerId is given', () => {
      const layerA = buildLayer({
        id: 'layerA',
        typeId: 'fr.a',
        roleId: 'role-a',
      });
      const layerB = buildLayer({
        id: 'layerB',
        typeId: 'fr.b',
        roleId: 'role-b',
      });
      itemService.getItemLayerInfo.mockReturnValue(of([layerA, layerB]));

      fixture.componentRef.setInput('source', {
        itemId: 'item1',
        partId: 'part1',
        layerId: 'role-b',
      } as PartPreviewSource);
      fixture.detectChanges();

      expect(component.selectedLayer.value?.id).toBe('layerB');
      expect(previewService.getTextSegments).toHaveBeenCalledWith('part1', [
        'layerB',
      ]);
    });

    it('should assign colors to layers using AppRepository.getPartColor', () => {
      appRepository.getPartColor.mockImplementation((typeId: string) =>
        typeId === 'fr.it.vedph.comment' ? 'ff0000' : undefined,
      );
      fixture.componentRef.setInput('source', {
        itemId: 'item1',
        partId: 'part1',
      } as PartPreviewSource);
      fixture.detectChanges();

      expect(component.layers()[0].color).toBe('#ff0000');
    });

    it('should leave color unset when AppRepository.getPartColor returns nothing', () => {
      fixture.componentRef.setInput('source', {
        itemId: 'item1',
        partId: 'part1',
      } as PartPreviewSource);
      fixture.detectChanges();

      expect(component.layers()[0].color).toBeUndefined();
    });

    it('should set busy while the item/layers request is pending', () => {
      const itemSubject = new Subject<Item | null>();
      itemService.getItem.mockReturnValue(itemSubject.asObservable());

      fixture.componentRef.setInput('source', {
        itemId: 'item1',
        partId: 'part1',
      } as PartPreviewSource);
      fixture.detectChanges();

      // getItemLayerInfo resolves synchronously, but forkJoin still waits
      // for the pending item request before emitting
      expect(component.busy()).toBe(true);
      expect(component.item()).toBeUndefined();

      itemSubject.next(buildItem());
      itemSubject.complete();
      fixture.detectChanges();

      expect(component.busy()).toBe(false);
      expect(component.item()?.id).toBe('item1');
    });

    it('should clear item/layers/segments when source becomes undefined again', () => {
      fixture.componentRef.setInput('source', {
        itemId: 'item1',
        partId: 'part1',
      } as PartPreviewSource);
      fixture.detectChanges();
      expect(component.item()).toBeDefined();

      fixture.componentRef.setInput('source', undefined);
      fixture.detectChanges();

      expect(component.item()).toBeUndefined();
      expect(component.layers()).toEqual([]);
      expect(component.segments()).toEqual([]);
    });

    it('should show a snackbar and reset busy when loading item/layers fails', () => {
      itemService.getItem.mockReturnValue(throwError(() => new Error('x')));
      fixture.componentRef.setInput('source', {
        itemId: 'item1',
        partId: 'part1',
      } as PartPreviewSource);
      fixture.detectChanges();

      expect(component.busy()).toBe(false);
      expect(snackbar.open).toHaveBeenCalledWith(
        'Error previewing text part part1',
      );
    });
  });

  describe('changing the selected layer', () => {
    it('should reload segments for just that layer', () => {
      const layerA = buildLayer({ id: 'layerA', roleId: 'role-a' });
      const layerB = buildLayer({ id: 'layerB', roleId: 'role-b' });
      itemService.getItemLayerInfo.mockReturnValue(of([layerA, layerB]));

      fixture.componentRef.setInput('source', {
        itemId: 'item1',
        partId: 'part1',
      } as PartPreviewSource);
      fixture.detectChanges();
      previewService.getTextSegments.mockClear();

      component.selectedLayer.setValue(layerB as DecoratedLayerPartInfo);
      fixture.detectChanges();

      expect(previewService.getTextSegments).toHaveBeenCalledWith('part1', [
        'layerB',
      ]);
    });

    it('should show a snackbar and reset busy when loading segments fails', () => {
      previewService.getTextSegments.mockReturnValue(
        throwError(() => new Error('x')),
      );
      fixture.componentRef.setInput('source', {
        itemId: 'item1',
        partId: 'part1',
      } as PartPreviewSource);
      fixture.detectChanges();

      expect(component.busy()).toBe(false);
      expect(snackbar.open).toHaveBeenCalledWith(
        'Error previewing text part part1',
      );
    });
  });

  describe('onSegmentClick / showFragments', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('source', {
        itemId: 'item1',
        partId: 'part1',
      } as PartPreviewSource);
      fixture.detectChanges();
    });

    it('should render the linked fragment and populate frHtml/frLabels', () => {
      const segment: ExportedSegment = {
        sourceId: 0,
        text: 'x',
        payloads: [
          {
            start: 0,
            end: 1,
            fragmentIds: ['fr.it.vedph.comment:fr.it.vedph.comment@2'],
          },
        ],
      };

      component.onSegmentClick(segment);
      fixture.detectChanges();

      expect(previewService.renderFragment).toHaveBeenCalledWith(
        'item1',
        'layer1',
        2,
      );
      expect(component.frHtml()).toEqual(['<p>fr</p>']);
      expect(component.frLabels()).toEqual(['fr.it.vedph.comment']);
    });

    it('should do nothing when the segment has no linked fragments', () => {
      previewService.renderFragment.mockClear();
      component.onSegmentClick({ sourceId: 0, text: 'x' });
      expect(previewService.renderFragment).not.toHaveBeenCalled();
    });

    it('should do nothing when the segment has an empty payloads array', () => {
      previewService.renderFragment.mockClear();
      component.onSegmentClick({ sourceId: 0, text: 'x', payloads: [] });
      expect(previewService.renderFragment).not.toHaveBeenCalled();
    });

    it('should show a snackbar and reset busy when rendering the fragment fails', () => {
      previewService.renderFragment.mockReturnValue(
        throwError(() => new Error('x')),
      );
      const segment: ExportedSegment = {
        sourceId: 0,
        text: 'x',
        payloads: [
          {
            start: 0,
            end: 1,
            fragmentIds: ['fr.it.vedph.comment:fr.it.vedph.comment@2'],
          },
        ],
      };

      component.onSegmentClick(segment);
      fixture.detectChanges();

      expect(component.busy()).toBe(false);
      expect(snackbar.open).toHaveBeenCalledWith(
        'Error previewing text part part1',
      );
    });
  });
});
