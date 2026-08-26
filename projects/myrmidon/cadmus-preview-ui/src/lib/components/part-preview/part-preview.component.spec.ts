import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError, Subject } from 'rxjs';
import { vi } from 'vitest';

import { ItemService, PreviewService, RenditionResult } from '@myrmidon/cadmus-api';
import { Item } from '@myrmidon/cadmus-core';

import { PartPreviewComponent, PartPreviewSource } from './part-preview.component';

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

describe('PartPreviewComponent', () => {
  let component: PartPreviewComponent;
  let fixture: ComponentFixture<PartPreviewComponent>;
  let itemService: { getItem: ReturnType<typeof vi.fn> };
  let previewService: { renderPart: ReturnType<typeof vi.fn> };
  let snackbar: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    itemService = { getItem: vi.fn().mockReturnValue(of(buildItem())) };
    previewService = {
      renderPart: vi
        .fn()
        .mockReturnValue(of({ result: '<p>hi</p>' } as RenditionResult)),
    };
    snackbar = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [PartPreviewComponent],
      providers: [
        { provide: ItemService, useValue: itemService },
        { provide: PreviewService, useValue: previewService },
        { provide: MatSnackBar, useValue: snackbar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PartPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not load anything when source is undefined', () => {
    expect(itemService.getItem).not.toHaveBeenCalled();
    expect(previewService.renderPart).not.toHaveBeenCalled();
    expect(component.item()).toBeUndefined();
    expect(component.html()).toBeUndefined();
  });

  it('should load the item and the rendered preview html when source is set', () => {
    const source: PartPreviewSource = { itemId: 'item1', partId: 'part1' };
    fixture.componentRef.setInput('source', source);
    fixture.detectChanges();

    expect(itemService.getItem).toHaveBeenCalledWith('item1', false);
    expect(previewService.renderPart).toHaveBeenCalledWith('item1', 'part1');
    expect(component.item()?.id).toBe('item1');
    expect(component.html()).toBe('<p>hi</p>');
    expect(component.busy()).toBe(false);
  });

  it('should set busy while the preview request is pending', () => {
    const itemSubject = new Subject<Item | null>();
    itemService.getItem.mockReturnValue(itemSubject.asObservable());

    fixture.componentRef.setInput('source', {
      itemId: 'item1',
      partId: 'part1',
    } as PartPreviewSource);
    fixture.detectChanges();

    expect(component.busy()).toBe(true);
    expect(component.item()).toBeUndefined();

    itemSubject.next(buildItem());
    itemSubject.complete();
    fixture.detectChanges();

    expect(component.busy()).toBe(false);
    expect(component.item()?.id).toBe('item1');
  });

  it('should clear item and html when source becomes undefined again', () => {
    fixture.componentRef.setInput('source', {
      itemId: 'item1',
      partId: 'part1',
    } as PartPreviewSource);
    fixture.detectChanges();
    expect(component.item()).toBeDefined();

    fixture.componentRef.setInput('source', undefined);
    fixture.detectChanges();
    expect(component.item()).toBeUndefined();
    expect(component.html()).toBeUndefined();
  });

  it('should clear item and html and not call services when source has no partId', () => {
    fixture.componentRef.setInput('source', {
      itemId: 'item1',
      partId: '',
    } as PartPreviewSource);
    fixture.detectChanges();

    expect(component.item()).toBeUndefined();
    expect(component.html()).toBeUndefined();
    expect(itemService.getItem).not.toHaveBeenCalled();
  });

  it('should set item to undefined when getItem resolves with null (item not found)', () => {
    itemService.getItem.mockReturnValue(of(null));
    fixture.componentRef.setInput('source', {
      itemId: 'item1',
      partId: 'part1',
    } as PartPreviewSource);
    fixture.detectChanges();

    expect(component.item()).toBeUndefined();
    // the preview html is unrelated to the item lookup, so it is still set
    expect(component.html()).toBe('<p>hi</p>');
  });

  it('should show a snackbar and reset busy on error', () => {
    previewService.renderPart.mockReturnValue(
      throwError(() => new Error('boom')),
    );
    fixture.componentRef.setInput('source', {
      itemId: 'item1',
      partId: 'part1',
    } as PartPreviewSource);
    fixture.detectChanges();

    expect(component.busy()).toBe(false);
    expect(snackbar.open).toHaveBeenCalledWith('Error previewing part part1');
  });

  it('refresh() should reload using the given source', () => {
    fixture.componentRef.setInput('source', {
      itemId: 'item1',
      partId: 'part1',
    } as PartPreviewSource);
    fixture.detectChanges();
    itemService.getItem.mockClear();
    previewService.renderPart.mockClear();

    component.refresh(component.source());

    expect(itemService.getItem).toHaveBeenCalledTimes(1);
    expect(previewService.renderPart).toHaveBeenCalledTimes(1);
  });

  it('refresh() with no source clears item/html without calling services', () => {
    fixture.componentRef.setInput('source', {
      itemId: 'item1',
      partId: 'part1',
    } as PartPreviewSource);
    fixture.detectChanges();
    itemService.getItem.mockClear();
    previewService.renderPart.mockClear();

    component.refresh(undefined);

    expect(component.item()).toBeUndefined();
    expect(component.html()).toBeUndefined();
    expect(itemService.getItem).not.toHaveBeenCalled();
    expect(previewService.renderPart).not.toHaveBeenCalled();
  });
});
