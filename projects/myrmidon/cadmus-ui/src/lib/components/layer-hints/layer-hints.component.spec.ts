import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { LayerHintsComponent } from './layer-hints.component';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { LayerHint } from '@myrmidon/cadmus-core';

function makeHint(overrides?: Partial<LayerHint>): LayerHint {
  return {
    location: '1.1',
    editOperation: 'del',
    impactLevel: 0,
    ...overrides,
  };
}

describe('LayerHintsComponent', () => {
  let component: LayerHintsComponent;
  let fixture: ComponentFixture<LayerHintsComponent>;
  let dialogService: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    dialogService = { confirm: vi.fn().mockReturnValue(of(true)) };

    await TestBed.configureTestingModule({
      imports: [LayerHintsComponent],
      providers: [{ provide: DialogService, useValue: dialogService }],
    }).compileComponents();

    fixture = TestBed.createComponent(LayerHintsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with an empty checks array', () => {
    expect(component).toBeTruthy();
    expect(component.form.checks().value().length).toBe(0);
  });

  it('should rebuild the checks array to match the hints count', () => {
    fixture.componentRef.setInput('hints', [makeHint(), makeHint(), makeHint()]);
    fixture.detectChanges();
    expect(component.form.checks().value()).toEqual([false, false, false]);
  });

  it('should reset checks (losing prior selections) when hints changes again', () => {
    fixture.componentRef.setInput('hints', [makeHint(), makeHint()]);
    fixture.detectChanges();
    component.form.checks[0]().value.set(true);
    expect(component.form.checks[0]().value()).toBe(true);

    fixture.componentRef.setInput('hints', [makeHint()]);
    fixture.detectChanges();
    expect(component.form.checks().value()).toEqual([false]);
  });

  describe('emitRequestEdit', () => {
    it('should emit the hint directly without confirmation', () => {
      const spy = vi.fn();
      component.requestEdit.subscribe(spy);
      const hint = makeHint();
      component.emitRequestEdit(hint);
      expect(spy).toHaveBeenCalledWith(hint);
      expect(dialogService.confirm).not.toHaveBeenCalled();
    });
  });

  describe('emitRequestDelete', () => {
    it('should emit requestDelete when the user confirms', () => {
      const spy = vi.fn();
      component.requestDelete.subscribe(spy);
      const hint = makeHint();
      component.emitRequestDelete(hint);
      expect(dialogService.confirm).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(hint);
    });

    it('should not emit requestDelete when the user cancels', () => {
      dialogService.confirm.mockReturnValue(of(false));
      const spy = vi.fn();
      component.requestDelete.subscribe(spy);
      component.emitRequestDelete(makeHint());
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('emitRequestMove', () => {
    it('should do nothing when there is no target location', () => {
      const spy = vi.fn();
      component.requestMove.subscribe(spy);
      component.emitRequestMove(makeHint());
      expect(dialogService.confirm).not.toHaveBeenCalled();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should emit requestMove when confirmed and a target location is set', () => {
      fixture.componentRef.setInput('targetLocation', '2.1');
      fixture.detectChanges();
      const spy = vi.fn();
      component.requestMove.subscribe(spy);
      const hint = makeHint();

      component.emitRequestMove(hint);

      expect(dialogService.confirm).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(hint);
    });
  });

  describe('emitRequestPatch', () => {
    it('should emit patchOperation values only for the checked hints', () => {
      const hints = [
        makeHint({ patchOperation: 'p1' }),
        makeHint({ patchOperation: 'p2' }),
        makeHint({ patchOperation: 'p3' }),
      ];
      fixture.componentRef.setInput('hints', hints);
      fixture.detectChanges();
      component.form.checks[0]().value.set(true);
      component.form.checks[2]().value.set(true);

      const spy = vi.fn();
      component.requestPatch.subscribe(spy);
      component.emitRequestPatch();

      expect(spy).toHaveBeenCalledWith(['p1', 'p3']);
    });

    it('should not emit when the user cancels the patch confirmation', () => {
      dialogService.confirm.mockReturnValue(of(false));
      fixture.componentRef.setInput('hints', [makeHint({ patchOperation: 'p1' })]);
      fixture.detectChanges();
      component.form.checks[0]().value.set(true);

      const spy = vi.fn();
      component.requestPatch.subscribe(spy);
      component.emitRequestPatch();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('template', () => {
    it('renders no <form> element, so it stays valid at any nesting depth', () => {
      fixture.componentRef.setInput('hints', [makeHint({ patchOperation: 'p1' })]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
    });

    it('binds each patch checkbox to its check and patches on click', () => {
      fixture.componentRef.setInput('hints', [
        makeHint({ patchOperation: 'p1' }),
        makeHint({ patchOperation: 'p2' }),
      ]);
      fixture.detectChanges();
      const spy = vi.fn();
      component.requestPatch.subscribe(spy);

      const inputs: HTMLInputElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('mat-checkbox input')
      );
      expect(inputs.length).toBe(2);
      inputs[1].click();
      fixture.detectChanges();
      expect(component.form.checks().value()).toEqual([false, true]);

      const button: HTMLButtonElement = Array.from<HTMLButtonElement>(
        fixture.nativeElement.querySelectorAll('button')
      ).find((b) => b.textContent?.includes('apply patches'))!;
      expect(button.type).toBe('button');
      button.click();
      expect(spy).toHaveBeenCalledWith(['p2']);
    });
  });

  describe('edit button', () => {
    it('emits requestEdit with its hint when clicked', () => {
      const hint = makeHint({ location: '2.1' });
      fixture.componentRef.setInput('hints', [makeHint(), hint]);
      fixture.detectChanges();
      const spy = vi.fn();
      component.requestEdit.subscribe(spy);
      const buttons: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll(
          'button[mattooltip="Edit this fragment"]'
        )
      );
      expect(buttons.length).toBe(2);
      buttons[1].click();
      expect(spy).toHaveBeenCalledWith(hint);
    });
  });
});
