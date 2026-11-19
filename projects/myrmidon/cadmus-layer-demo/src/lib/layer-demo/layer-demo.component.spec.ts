import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { TokenLocation } from '@myrmidon/cadmus-core';

import { LAYER_DEMO_TEXT, LayerDemoComponent } from './layer-demo.component';

describe('LayerDemoComponent', () => {
  let component: LayerDemoComponent;
  let fixture: ComponentFixture<LayerDemoComponent>;
  let host: HTMLElement;

  const locs = () => component.locations().map((l) => l.toString());

  const typeAndAdd = (value: string) => {
    component.demoForm.location().value.set(value);
    component.addTypedLocation();
  };

  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const seg = (id: number) =>
    host.querySelector(`[data-seg-id="${id}"]`) as HTMLElement;

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayerDemoComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(LayerDemoComponent);
    component = fixture.componentInstance;
    host = fixture.nativeElement as HTMLElement;
    await settle();
  });

  it('should create with default form values', () => {
    expect(component).toBeTruthy();
    expect(component.demoForm.text().value()).toBe(LAYER_DEMO_TEXT);
    expect(component.demoForm.location().value()).toBe('1.2@2x2');
    expect(component.locations()).toEqual([]);
    expect(component.textSize()).toBe(16);
  });

  it('should render the text live', async () => {
    expect(host.querySelector('cadmus-decorated-token-text')?.textContent).toContain(
      'epsilon',
    );
    component.demoForm.text().value.set('omega');
    await settle();
    expect(host.querySelector('cadmus-decorated-token-text')?.textContent).toContain(
      'omega',
    );
  });

  describe('makeLarger / makeSmaller', () => {
    it('should increase textSize by 2, up to a max of 24', () => {
      for (let i = 0; i < 10; i++) {
        component.makeLarger();
      }
      expect(component.textSize()).toBe(24);
    });

    it('should decrease textSize by 2, down to a min of 12', () => {
      for (let i = 0; i < 10; i++) {
        component.makeSmaller();
      }
      expect(component.textSize()).toBe(12);
    });
  });

  describe('addTypedLocation', () => {
    it('should do nothing for an empty location value', () => {
      typeAndAdd('');
      expect(component.locations()).toEqual([]);
      expect(component.locationError()).toBeNull();
    });

    it('should flag an unparsable location value', () => {
      typeAndAdd('not-a-location');
      expect(component.locations()).toEqual([]);
      expect(component.locationError()).toBe('invalid location');
    });

    it('should flag a location not found in the text', () => {
      typeAndAdd('9.1');
      expect(component.locations()).toEqual([]);
      expect(component.locationError()).toBe('location not found in text');
    });

    it('should insert the first location', () => {
      typeAndAdd('1.2');
      expect(locs()).toEqual(['1.2']);
      expect(component.locationError()).toBeNull();
    });

    it('should keep locations sorted on insertion', () => {
      typeAndAdd('3.3');
      typeAndAdd('1.1');
      typeAndAdd('2.1');
      expect(locs()).toEqual(['1.1', '2.1', '3.3']);
    });

    it('should not add a duplicate (equal) location', () => {
      typeAndAdd('1.2');
      typeAndAdd('1.2');
      expect(component.locations().length).toBe(1);
    });

    it('should remove existing locations overlapping the new one', () => {
      typeAndAdd('1.1-2.1');
      typeAndAdd('3.2');
      expect(component.locations().length).toBe(2);

      // this new range overlaps both the previous ones
      typeAndAdd('1.2-3.3');

      expect(locs()).toEqual(['1.2-3.3']);
    });

    it('should add on form submission', async () => {
      component.demoForm.location().value.set('2.1');
      const event = new Event('submit', { cancelable: true });
      host.querySelector('form')!.dispatchEvent(event);
      await Promise.resolve();
      expect(event.defaultPrevented).toBe(true);
      expect(locs()).toEqual(['2.1']);
    });
  });

  describe('selection', () => {
    it('should add the selected portion of text as a fragment', async () => {
      // 1.2 = beta = IDs 7-10
      drag(7, 10);
      expect(component.selection()?.location?.toString()).toBe('1.2');
      expect(component.selection()?.text).toBe('beta');

      component.addSelection();
      await settle();

      expect(locs()).toEqual(['1.2']);
      expect(component.selection()).toBeNull();
      expect(seg(7).classList).toContain('mode-blocked');
    });

    it('should not add an empty selection', () => {
      component.addSelection();
      expect(component.locations()).toEqual([]);
    });

    it('should stop a selection before a fragment', async () => {
      typeAndAdd('1.2');
      await settle();
      // from alpha to gamma (2.1, ID 12) across beta
      drag(1, 13);
      expect(component.selection()?.location?.toString()).toBe('1.1');
    });

    it('should clear the selection', () => {
      drag(1, 3);
      expect(component.selection()).not.toBeNull();
      component.clearSelection();
      expect(component.selection()).toBeNull();
    });
  });

  describe('picked fragment', () => {
    it('should pick a fragment with its text', async () => {
      typeAndAdd('3.1@4x2-3.2@1');
      await settle();
      component.pickLocation(component.locations()[0]);
      expect(component.selectedText()).toBe('ta e');
    });

    it('should pick a fragment by clicking it', async () => {
      typeAndAdd('1.2');
      await settle();
      seg(8).dispatchEvent(
        new PointerEvent('pointerdown', { button: 0, bubbles: true }),
      );
      seg(8).dispatchEvent(
        new PointerEvent('pointerup', { button: 0, bubbles: true }),
      );
      await settle();
      expect(component.selectedLocation()?.toString()).toBe('1.2');
      expect(component.selectedText()).toBe('beta');
    });
  });

  describe('removeLocation', () => {
    it('should remove the given location instance', () => {
      typeAndAdd('1.1');
      typeAndAdd('1.2');
      const toRemove = component.locations()[0];

      component.removeLocation(toRemove);

      expect(component.locations().length).toBe(1);
      expect(component.locations()).not.toContain(toRemove);
    });

    it('should clear the picked fragment when removing it', () => {
      typeAndAdd('1.1');
      const loc = component.locations()[0];
      component.pickLocation(loc);
      component.removeLocation(loc);
      expect(component.selectedLocation()).toBeUndefined();
    });

    it('should do nothing when the location is not found', () => {
      typeAndAdd('1.1');
      component.removeLocation(TokenLocation.parse('9.9')!);
      expect(component.locations().length).toBe(1);
    });
  });

  describe('clearLocations', () => {
    it('should empty the locations list', () => {
      typeAndAdd('1.1');
      component.pickLocation(component.locations()[0]);
      component.clearLocations();
      expect(component.locations()).toEqual([]);
      expect(component.selectedLocation()).toBeUndefined();
    });
  });

  it('should render the text limit as a maxlength attribute', () => {
    const textarea: HTMLTextAreaElement = host.querySelector('#text')!;
    expect(textarea.maxLength).toBe(5000);
  });
});
