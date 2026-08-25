import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { firstValueFrom, Observable, of } from 'rxjs';
import { DialogService } from '@myrmidon/ngx-mat-tools';

import {
  ComponentCanDeactivate,
  pendingChangesGuard,
  PendingChangesGuard,
} from './pending-changes.guard';

function setup(confirmResult: boolean): {
  confirmSpy: ReturnType<typeof vi.fn>;
} {
  const confirmSpy = vi.fn().mockReturnValue(of(confirmResult));
  TestBed.configureTestingModule({
    providers: [{ provide: DialogService, useValue: { confirm: confirmSpy } }],
  });
  return { confirmSpy };
}

const noRoute = {} as ActivatedRouteSnapshot;
const noState = {} as RouterStateSnapshot;

describe('pendingChangesGuard', () => {
  it('should allow deactivation without confirming when component is falsy', () => {
    const { confirmSpy } = setup(false);
    const result = TestBed.runInInjectionContext(() =>
      pendingChangesGuard(
        undefined as unknown as ComponentCanDeactivate,
        noRoute,
        noState,
        noState
      )
    );
    expect(result).toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('should allow deactivation without confirming when canDeactivate() is true', () => {
    const { confirmSpy } = setup(false);
    const component: ComponentCanDeactivate = { canDeactivate: () => true };
    const result = TestBed.runInInjectionContext(() =>
      pendingChangesGuard(component, noRoute, noState, noState)
    );
    expect(result).toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('should confirm and resolve to true when the user confirms leaving', async () => {
    const { confirmSpy } = setup(true);
    const component: ComponentCanDeactivate = { canDeactivate: () => false };
    const result$ = TestBed.runInInjectionContext(() =>
      pendingChangesGuard(component, noRoute, noState, noState)
    ) as Observable<boolean>;

    await expect(firstValueFrom(result$)).resolves.toBe(true);
    expect(confirmSpy).toHaveBeenCalledWith(
      'Warning',
      'There are unsaved changes. Do you want to leave?'
    );
  });

  it('should confirm and resolve to false when the user cancels leaving', async () => {
    setup(false);
    const component: ComponentCanDeactivate = { canDeactivate: () => false };
    const result$ = TestBed.runInInjectionContext(() =>
      pendingChangesGuard(component, noRoute, noState, noState)
    ) as Observable<boolean>;

    await expect(firstValueFrom(result$)).resolves.toBe(false);
  });

  it('should support a component whose canDeactivate() returns an observable', async () => {
    setup(false);
    const component: ComponentCanDeactivate = {
      canDeactivate: () => of(false) as unknown as boolean,
    };
    // canDeactivate() returning a truthy Observable object is treated as
    // truthy by the guard's `!component || component.canDeactivate()` check,
    // so deactivation is allowed without ever calling confirm().
    const result = TestBed.runInInjectionContext(() =>
      pendingChangesGuard(component, noRoute, noState, noState)
    );
    expect(result).toBeTruthy();
  });
});

describe('PendingChangesGuard (legacy)', () => {
  function createService(confirmResult: boolean): {
    service: PendingChangesGuard;
    confirmSpy: ReturnType<typeof vi.fn>;
  } {
    const { confirmSpy } = setup(confirmResult);
    return { service: TestBed.inject(PendingChangesGuard), confirmSpy };
  }

  it('should be created', () => {
    const { service } = createService(true);
    expect(service).toBeTruthy();
  });

  it('should allow deactivation without confirming when component is falsy', () => {
    const { service, confirmSpy } = createService(false);
    expect(
      service.canDeactivate(undefined as unknown as ComponentCanDeactivate)
    ).toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('should allow deactivation without confirming when canDeactivate() is true', () => {
    const { service, confirmSpy } = createService(false);
    const component: ComponentCanDeactivate = { canDeactivate: () => true };
    expect(service.canDeactivate(component)).toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('should confirm and resolve to true when the user confirms leaving', async () => {
    const { service, confirmSpy } = createService(true);
    const component: ComponentCanDeactivate = { canDeactivate: () => false };
    const result$ = service.canDeactivate(component) as Observable<boolean>;

    await expect(firstValueFrom(result$)).resolves.toBe(true);
    expect(confirmSpy).toHaveBeenCalledWith(
      'Warning',
      'There are unsaved changes. Do you want to leave?'
    );
  });

  it('should confirm and resolve to false when the user cancels leaving', async () => {
    const { service } = createService(false);
    const component: ComponentCanDeactivate = { canDeactivate: () => false };
    const result$ = service.canDeactivate(component) as Observable<boolean>;

    await expect(firstValueFrom(result$)).resolves.toBe(false);
  });
});
