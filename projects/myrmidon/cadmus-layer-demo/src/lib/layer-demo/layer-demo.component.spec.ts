import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayerDemoComponent } from './layer-demo.component';
import { TextLayerService, TokenLocation } from '@myrmidon/cadmus-core';

describe('LayerDemoComponent', () => {
  let component: LayerDemoComponent;
  let fixture: ComponentFixture<LayerDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayerDemoComponent],
      providers: [TextLayerService],
    }).compileComponents();

    fixture = TestBed.createComponent(LayerDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with default form values', () => {
    expect(component).toBeTruthy();
    expect(component.rendition.text().value()).toBe('alpha beta\ngamma\ndelta epsilon waw\nzeta');
    expect(component.rendition.location().value()).toBe('1.2@2x2');
    expect(component.locations()).toEqual([]);
    expect(component.textSize()).toBe(14);
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

  describe('addLocation', () => {
    it('should do nothing for an empty location value', () => {
      component.rendition.location().value.set('');
      component.addLocation();
      expect(component.locations()).toEqual([]);
    });

    it('should do nothing for an unparsable location value', () => {
      component.rendition.location().value.set('not-a-location');
      component.addLocation();
      expect(component.locations()).toEqual([]);
    });

    it('should insert the first location', () => {
      component.rendition.location().value.set('1.2');
      component.addLocation();
      expect(component.locations().map((l) => l.toString())).toEqual(['1.2']);
    });

    it('should keep locations sorted on insertion', () => {
      component.rendition.location().value.set('1.5');
      component.addLocation();
      component.rendition.location().value.set('1.1');
      component.addLocation();
      component.rendition.location().value.set('1.3');
      component.addLocation();

      expect(component.locations().map((l) => l.toString())).toEqual([
        '1.1',
        '1.3',
        '1.5',
      ]);
    });

    it('should not add a duplicate (equal) location', () => {
      component.rendition.location().value.set('1.2');
      component.addLocation();
      component.rendition.location().value.set('1.2');
      component.addLocation();
      expect(component.locations().length).toBe(1);
    });

    it('should remove existing locations overlapping the new one', () => {
      component.rendition.location().value.set('1.1-1.3');
      component.addLocation();
      component.rendition.location().value.set('1.5');
      component.addLocation();
      expect(component.locations().length).toBe(2);

      // this new range overlaps both the previous ones
      component.rendition.location().value.set('1.2-1.6');
      component.addLocation();

      expect(component.locations().map((l) => l.toString())).toEqual([
        '1.2-1.6',
      ]);
    });
  });

  describe('removeLocation', () => {
    it('should remove the given location instance', () => {
      component.rendition.location().value.set('1.1');
      component.addLocation();
      component.rendition.location().value.set('1.2');
      component.addLocation();
      const toRemove = component.locations()[0];

      component.removeLocation(toRemove);

      expect(component.locations().length).toBe(1);
      expect(component.locations()).not.toContain(toRemove);
    });

    it('should do nothing when the location is not found', () => {
      component.rendition.location().value.set('1.1');
      component.addLocation();
      component.removeLocation(TokenLocation.parse('9.9')!);
      expect(component.locations().length).toBe(1);
    });
  });

  describe('clearLocations', () => {
    it('should empty the locations list', () => {
      component.rendition.location().value.set('1.1');
      component.addLocation();
      component.clearLocations();
      expect(component.locations()).toEqual([]);
    });
  });

  describe('render', () => {
    it('should do nothing when the text is empty', () => {
      component.rendition.text().value.set('');
      component.render();
      expect(component.result()).toBe('');
    });

    it('should render the text with its locations', () => {
      component.rendition.text().value.set('alpha beta gamma');
      component.rendition.location().value.set('1.2');
      component.addLocation();

      component.render();

      expect(component.result()).toContain('<span id="f1.2_0" class="fr">beta</span>');
    });
  });

  describe('getLocationForNew / getLocationForEdit', () => {
    it('getLocationForNew should do nothing when the text is empty', () => {
      component.rendition.text().value.set('');
      component.getLocationForNew();
      expect(component.userLocation()).toBeUndefined();
    });

    it('getLocationForNew should set userLocation to undefined when getSelectedRange is null', () => {
      component.rendition.text().value.set('alpha beta');
      // jsdom has no active selection by default, so getSelectedRange() is null
      component.getLocationForNew();
      expect(component.userLocation()).toBeUndefined();
    });

    it('getLocationForEdit should set userLocation to undefined when getSelectedRange is null', () => {
      component.getLocationForEdit();
      expect(component.userLocation()).toBeUndefined();
    });
  });

  describe('submission root', () => {
    function submit(): Event {
      const event = new Event('submit', { cancelable: true });
      fixture.nativeElement.querySelector('form').dispatchEvent(event);
      return event;
    }

    it('renders on submit, preventing the native submission', async () => {
      component.rendition.text().value.set('alpha beta gamma');
      fixture.detectChanges();
      const event = submit();
      await Promise.resolve();
      expect(event.defaultPrevented).toBe(true);
      expect(component.result()).toContain('alpha');
    });

    it('renders on submit even when the location is empty (invalid)', async () => {
      component.rendition.text().value.set('alpha beta gamma');
      component.rendition.location().value.set('');
      fixture.detectChanges();
      expect(component.rendition().invalid()).toBe(true);
      submit();
      await Promise.resolve();
      expect(component.result()).toContain('alpha');
    });

    it('renders the text limit as a maxlength attribute', () => {
      const textarea: HTMLTextAreaElement =
        fixture.nativeElement.querySelector('#text');
      expect(textarea.maxLength).toBe(1000);
      const location: HTMLInputElement =
        fixture.nativeElement.querySelector('#location');
      expect(location.required).toBe(true);
    });
  });

  describe('remove location button', () => {
    it('removes the location without submitting (re-rendering)', async () => {
      component.rendition.text().value.set('alpha beta gamma');
      component.rendition.location().value.set('1.2');
      component.addLocation();
      fixture.detectChanges();
      const renderSpy = vi.spyOn(component, 'render');

      const remove: HTMLButtonElement = fixture.nativeElement.querySelector(
        'table button'
      );
      expect(remove.type).toBe('button');
      remove.click();
      await Promise.resolve();

      expect(component.locations().length).toBe(0);
      expect(renderSpy).not.toHaveBeenCalled();
    });
  });
});
