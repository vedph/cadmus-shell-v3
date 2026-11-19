import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { TokenLocation } from '@myrmidon/cadmus-core';

import {
  DecoratedTokenTextComponent,
  DecoratedTokenTextSelection,
} from './decorated-token-text.component';

// IDs are UTF-16 offsets + 1:
// a=1 l=2 p=3 h=4 a=5 _=6 b=7 e=8 t=9 a=10 _=11 g=12 a=13 m=14 m=15 a=16
const TEXT = 'alpha beta gamma';

describe('DecoratedTokenTextComponent', () => {
  let component: DecoratedTokenTextComponent;
  let fixture: ComponentFixture<DecoratedTokenTextComponent>;
  let host: HTMLElement;
  let changes: DecoratedTokenTextSelection[];

  const seg = (id: number) =>
    host.querySelector(`[data-seg-id="${id}"]`) as HTMLElement;

  const click = (id: number) => {
    seg(id).dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, bubbles: true }),
    );
    seg(id).dispatchEvent(
      new PointerEvent('pointerup', { button: 0, bubbles: true }),
    );
    fixture.detectChanges();
  };

  const drag = (from: number, to: number) => {
    seg(from).dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, bubbles: true }),
    );
    seg(to).dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    seg(to).dispatchEvent(
      new PointerEvent('pointerup', { button: 0, bubbles: true }),
    );
    fixture.detectChanges();
  };

  const setInputs = async (inputs: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(inputs)) {
      fixture.componentRef.setInput(k, v);
    }
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DecoratedTokenTextComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(DecoratedTokenTextComponent);
    component = fixture.componentInstance;
    host = fixture.nativeElement as HTMLElement;
    changes = [];
    component.selectionChange.subscribe((s) => changes.push(s));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render nothing for an empty base text', () => {
    expect(component.blocks()).toEqual([]);
    expect(host.querySelectorAll('[data-seg-id]').length).toBe(0);
  });

  it('should render the base text, a segment per char', async () => {
    await setInputs({ baseText: 'alpha beta\ngamma' });
    expect(host.querySelectorAll('[data-seg-id]').length).toBe(15);
    // the text content is the text, so that consumers can find it
    expect(host.textContent).toContain('alpha');
    expect(host.textContent).toContain('gamma');
  });

  it('should hide the toolbar by default', async () => {
    await setInputs({ baseText: TEXT });
    expect(host.querySelector('.toolbar')).toBeNull();
  });

  it('should show the toolbar on request', async () => {
    await setInputs({ baseText: TEXT, showToolbar: true });
    expect(host.querySelector('.toolbar')).not.toBeNull();
  });

  it('should block and highlight the characters of fragments', async () => {
    await setInputs({
      baseText: TEXT,
      locations: [TokenLocation.parse('1.2')!],
    });
    for (let id = 7; id <= 10; id++) {
      expect(seg(id).classList).toContain('mode-blocked');
      expect(seg(id).classList).toContain('fr');
    }
    expect(seg(6).classList).not.toContain('mode-blocked');
    expect(seg(11).classList).not.toContain('mode-blocked');
    expect(seg(1).classList).not.toContain('fr');
  });

  it('should block whitespace inside a multi-token fragment', async () => {
    await setInputs({
      baseText: TEXT,
      locations: [TokenLocation.parse('1.1@4x2-1.2@1x2')!],
    });
    expect([...component.fragmentMap().keys()]).toEqual([4, 5, 6, 7, 8]);
    expect(seg(6).classList).toContain('mode-blocked');
  });

  it('should block only the characters of a partial fragment', async () => {
    await setInputs({
      baseText: TEXT,
      locations: [TokenLocation.parse('1.2@2x2')!],
    });
    expect([...component.fragmentMap().keys()]).toEqual([8, 9]);
  });

  it('should ignore fragments outside of the text', async () => {
    await setInputs({
      baseText: TEXT,
      locations: [TokenLocation.parse('9.1')!],
    });
    expect(component.fragmentMap().size).toBe(0);
  });

  it('should emit the location of a new selection', async () => {
    await setInputs({ baseText: TEXT });
    drag(2, 4);
    expect(changes.length).toBe(1);
    expect(changes[0].location?.toString()).toBe('1.1@2x3');
    expect(changes[0].text).toBe('lph');
    expect(changes[0].overlapping).toBe(false);
    expect(component.selection().location?.toString()).toBe('1.1@2x3');
  });

  it('should ignore edge whitespace in a selection', async () => {
    await setInputs({ baseText: TEXT });
    drag(6, 11);
    expect(changes[0].location?.toString()).toBe('1.2');
  });

  it('should stop a selection before a fragment', async () => {
    await setInputs({
      baseText: TEXT,
      locations: [TokenLocation.parse('1.2')!],
    });
    // drag from alpha to gamma, across beta
    drag(1, 14);
    expect(changes[0].location?.toString()).toBe('1.1');
  });

  it('should pick a fragment when clicking it', async () => {
    const loc = TokenLocation.parse('1.2')!;
    await setInputs({ baseText: TEXT, locations: [loc] });
    click(8);
    expect(component.selectedLocation()).toBe(loc);
    for (let id = 7; id <= 10; id++) {
      expect(seg(id).classList).toContain('fr-sel');
    }
  });

  it('should not pick anything when clicking outside fragments', async () => {
    await setInputs({
      baseText: TEXT,
      locations: [TokenLocation.parse('1.2')!],
    });
    click(2);
    expect(component.selectedLocation()).toBeUndefined();
  });

  it('should clear the picked fragment on a new selection', async () => {
    const loc = TokenLocation.parse('1.2')!;
    await setInputs({ baseText: TEXT, locations: [loc] });
    click(8);
    expect(component.selectedLocation()).toBe(loc);
    drag(1, 3);
    expect(component.selectedLocation()).toBeUndefined();
  });

  it('should clear the new selection when picking a fragment', async () => {
    await setInputs({
      baseText: TEXT,
      locations: [TokenLocation.parse('1.2')!],
    });
    drag(1, 3);
    expect(component.selection().location?.toString()).toBe('1.1@1x3');
    click(8);
    expect(component.selection().location).toBeNull();
  });

  it('should highlight a fragment equal to the selected location', async () => {
    const a = TokenLocation.parse('1.1@1x2')!;
    const b = TokenLocation.parse('1.1@4x2')!;
    await setInputs({
      baseText: TEXT,
      locations: [a, b],
      selectedLocation: TokenLocation.parse('1.1@4x2')!,
    });
    // both are points in the same token, so they overlap: the equal one
    // must be preferred
    expect(seg(1).classList).not.toContain('fr-sel');
    expect(seg(4).classList).toContain('fr-sel');
  });

  it('should highlight fragments overlapping the selected location', async () => {
    await setInputs({
      baseText: TEXT,
      locations: [TokenLocation.parse('1.2-1.3')!],
      selectedLocation: TokenLocation.parse('1.2')!,
    });
    expect(seg(7).classList).toContain('fr-sel');
    expect(seg(14).classList).toContain('fr-sel');
  });

  it('should clear a selection covered by a new fragment', async () => {
    await setInputs({ baseText: TEXT });
    drag(7, 10);
    expect(component.selection().location?.toString()).toBe('1.2');
    await setInputs({ locations: [TokenLocation.parse('1.2')!] });
    expect(component.selectedIds()).toEqual([]);
    expect(component.selection().location).toBeNull();
    expect(changes[changes.length - 1].location).toBeNull();
  });

  it('should flag a typed selection overlapping a fragment', async () => {
    await setInputs({
      baseText: TEXT,
      locations: [TokenLocation.parse('1.2')!],
    });
    component.onSelectionChange({
      ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      segments: component.blocks()[0].segments.slice(0, 10),
      coords: '1.1-1.2',
    });
    expect(changes[0].overlapping).toBe(true);
    expect(changes[0].location).toBeNull();
    expect(changes[0].coords).toBe('1.1-1.2');
  });

  it('should find text across characters by default', async () => {
    await setInputs({ baseText: TEXT, showToolbar: true });
    const view = component['_view']()!;
    expect(view.store.find().crossSegments).toBe(true);
    view.store.find.update((f) => ({ ...f, query: 'beta' }));
    expect(view.store.matches()).toEqual([[7, 8, 9, 10]]);
  });

  it('should derive the text box height from the font size', async () => {
    await setInputs({ baseText: TEXT, fontSize: 20 });
    expect(component.resolvedSettings().fontSize).toBe('20px');
    expect(component.resolvedSettings().textRectHeight).toBe(30);
  });

  it('should get the text of a location', async () => {
    await setInputs({ baseText: 'alpha beta\ngamma' });
    expect(
      component.getLocationText(TokenLocation.parse('1.2@3-2.1@1x2')!),
    ).toBe('ta ga');
  });
});
