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
    expect(component.checks.length).toBe(0);
  });

  it('should rebuild the checks array to match the hints count', () => {
    fixture.componentRef.setInput('hints', [makeHint(), makeHint(), makeHint()]);
    fixture.detectChanges();
    expect(component.checks.length).toBe(3);
    expect(component.checks.controls.every((c) => c.value === false)).toBe(
      true
    );
  });

  it('should reset checks (losing prior selections) when hints changes again', () => {
    fixture.componentRef.setInput('hints', [makeHint(), makeHint()]);
    fixture.detectChanges();
    component.checks.at(0).setValue(true);
    expect(component.checks.at(0).value).toBe(true);

    fixture.componentRef.setInput('hints', [makeHint()]);
    fixture.detectChanges();
    expect(component.checks.length).toBe(1);
    expect(component.checks.at(0).value).toBe(false);
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
    it('should do nothing when the form is invalid', () => {
      component.form.setErrors({ invalid: true });
      const spy = vi.fn();
      component.requestPatch.subscribe(spy);
      component.emitRequestPatch();
      expect(dialogService.confirm).not.toHaveBeenCalled();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should emit patchOperation values only for the checked hints', () => {
      const hints = [
        makeHint({ patchOperation: 'p1' }),
        makeHint({ patchOperation: 'p2' }),
        makeHint({ patchOperation: 'p3' }),
      ];
      fixture.componentRef.setInput('hints', hints);
      fixture.detectChanges();
      component.checks.at(0).setValue(true);
      component.checks.at(2).setValue(true);

      const spy = vi.fn();
      component.requestPatch.subscribe(spy);
      component.emitRequestPatch();

      expect(spy).toHaveBeenCalledWith(['p1', 'p3']);
    });

    it('should not emit when the user cancels the patch confirmation', () => {
      dialogService.confirm.mockReturnValue(of(false));
      fixture.componentRef.setInput('hints', [makeHint({ patchOperation: 'p1' })]);
      fixture.detectChanges();
      component.checks.at(0).setValue(true);

      const spy = vi.fn();
      component.requestPatch.subscribe(spy);
      component.emitRequestPatch();

      expect(spy).not.toHaveBeenCalled();
    });
  });
});
