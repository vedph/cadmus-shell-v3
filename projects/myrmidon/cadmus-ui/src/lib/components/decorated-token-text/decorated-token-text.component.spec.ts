import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DecoratedTokenTextComponent } from './decorated-token-text.component';
import { TextLayerService, TokenLocation } from '@myrmidon/cadmus-core';

describe('DecoratedTokenTextComponent', () => {
  let component: DecoratedTokenTextComponent;
  let fixture: ComponentFixture<DecoratedTokenTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DecoratedTokenTextComponent],
      providers: [TextLayerService],
    }).compileComponents();

    fixture = TestBed.createComponent(DecoratedTokenTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render an empty div for an empty base text', () => {
    expect(component.text()).toBe('<div></div>');
  });

  it('should render the base text decorated with the given locations', () => {
    fixture.componentRef.setInput('baseText', 'alpha beta gamma');
    fixture.componentRef.setInput('locations', [TokenLocation.parse('1.2')!]);
    fixture.detectChanges();

    expect(component.text()).toContain('<span id="f1.2_0" class="fr">beta</span>');
  });

  it('should mark the selected location with the fr-sel class', () => {
    const loc = TokenLocation.parse('1.2')!;
    fixture.componentRef.setInput('baseText', 'alpha beta gamma');
    fixture.componentRef.setInput('locations', [loc]);
    fixture.componentRef.setInput('selectedLocation', loc);
    fixture.detectChanges();

    expect(component.text()).toContain('class="fr fr-sel"');
  });

  it('should recompute when the base text changes', () => {
    fixture.componentRef.setInput('baseText', 'alpha');
    fixture.detectChanges();
    const first = component.text();

    fixture.componentRef.setInput('baseText', 'beta');
    fixture.detectChanges();

    expect(component.text()).not.toBe(first);
    expect(component.text()).toContain('beta');
  });
});
