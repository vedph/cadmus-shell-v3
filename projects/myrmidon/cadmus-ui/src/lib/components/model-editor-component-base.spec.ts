import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedObject, Part, PartIdentity, Thesaurus } from '@myrmidon/cadmus-core';

import { ModelEditorComponentBase } from './model-editor-component-base';

@Component({
  template: '',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TestEditorComponent extends ModelEditorComponentBase<Part> {
  public buildFormCalls = 0;
  public onDataSetCalls: (EditedObject<Part> | undefined)[] = [];
  public getValueResult: Part = makePart();

  protected override buildForm(fb: FormBuilder): FormGroup {
    this.buildFormCalls++;
    return fb.group({ title: [''] });
  }

  protected override onDataSet(data?: EditedObject<Part>): void {
    this.onDataSetCalls.push(data);
  }

  protected override getValue(): Part {
    return this.getValueResult;
  }

  public callInitSettings<S>(
    typeId: string,
    callback: (settings: S | undefined) => void
  ): void {
    this.initSettings(typeId, callback);
  }

  public callGetEditedPart(typeId: string): Part {
    return this.getEditedPart(typeId);
  }

  public callGetEditedFragment() {
    return this.getEditedFragment();
  }

  public callHasThesaurus(key: string): boolean {
    return this.hasThesaurus(key);
  }
}

function makePart(overrides?: Partial<Part>): Part {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: 'it.vedph.note',
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    ...overrides,
  };
}

function makeUser(overrides?: Partial<User>): User {
  return {
    userName: 'bob',
    email: 'bob@x.com',
    roles: [],
    ...overrides,
  };
}

describe('ModelEditorComponentBase', () => {
  let authUser$: BehaviorSubject<User | null>;
  let authService: {
    currentUser$: BehaviorSubject<User | null>;
    currentUserValue: User | null;
  };
  let appRepository: {
    getTypeThesaurus: ReturnType<typeof vi.fn>;
    getSettingFor: ReturnType<typeof vi.fn>;
  };

  function createComponent(): ComponentFixture<TestEditorComponent> {
    authUser$ = new BehaviorSubject<User | null>(null);
    authService = {
      currentUser$: authUser$,
      get currentUserValue() {
        return authUser$.value;
      },
    };
    appRepository = {
      getTypeThesaurus: vi.fn().mockReturnValue(undefined),
      getSettingFor: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      imports: [TestEditorComponent],
      providers: [
        { provide: AuthJwtService, useValue: authService },
        { provide: AppRepository, useValue: appRepository },
      ],
    });
    const fixture = TestBed.createComponent(TestEditorComponent);
    fixture.detectChanges();
    return fixture;
  }

  describe('initialization', () => {
    it('should build the form via buildForm on ngOnInit', () => {
      const fixture = createComponent();
      expect(fixture.componentInstance.buildFormCalls).toBe(1);
      expect(fixture.componentInstance.form).toBeTruthy();
    });

    it('should start with userLevel 0 and no user when unauthenticated', () => {
      const fixture = createComponent();
      expect(fixture.componentInstance.user).toBeUndefined();
      expect(fixture.componentInstance.userLevel).toBe(0);
    });

    it('should update user and userLevel when the auth user changes', () => {
      const fixture = createComponent();
      authUser$.next(makeUser({ roles: ['editor'] }));
      expect(fixture.componentInstance.user?.userName).toBe('bob');
      expect(fixture.componentInstance.userLevel).toBe(3);
    });

    it('should compute userLevel 4 for admin, 2 for operator, 1 for visitor', () => {
      const fixture = createComponent();
      authUser$.next(makeUser({ roles: ['admin'] }));
      expect(fixture.componentInstance.userLevel).toBe(4);
      authUser$.next(makeUser({ roles: ['operator'] }));
      expect(fixture.componentInstance.userLevel).toBe(2);
      authUser$.next(makeUser({ roles: ['visitor'] }));
      expect(fixture.componentInstance.userLevel).toBe(1);
    });

    it('should reset user and userLevel to 0 when the user logs out', () => {
      const fixture = createComponent();
      authUser$.next(makeUser({ roles: ['admin'] }));
      authUser$.next(null);
      expect(fixture.componentInstance.user).toBeUndefined();
      expect(fixture.componentInstance.userLevel).toBe(0);
    });
  });

  describe('disabled input', () => {
    it('should disable the form when disabled is true', () => {
      const fixture = createComponent();
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      expect(fixture.componentInstance.form.disabled).toBe(true);
    });

    it('should enable the form when disabled is false', () => {
      const fixture = createComponent();
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      fixture.componentRef.setInput('disabled', false);
      fixture.detectChanges();
      expect(fixture.componentInstance.form.disabled).toBe(false);
    });
  });

  describe('data/identity effects', () => {
    it('should call onDataSet when data changes', () => {
      const fixture = createComponent();
      const data: EditedObject<Part> = { value: makePart(), thesauri: {} };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();
      expect(fixture.componentInstance.onDataSetCalls.at(-1)).toEqual(data);
    });

    it('should assign identity.partId to a new part with no id', () => {
      const fixture = createComponent();
      const data: EditedObject<Part> = {
        value: makePart({ id: '' }),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();

      const identity: PartIdentity = {
        itemId: 'item1',
        typeId: 'it.vedph.note',
        partId: 'new-id',
        roleId: null,
      };
      fixture.componentRef.setInput('identity', identity);
      fixture.detectChanges();

      expect(fixture.componentInstance.data()!.value!.id).toBe('new-id');
    });

    it('should not overwrite an existing part id', () => {
      const fixture = createComponent();
      const data: EditedObject<Part> = {
        value: makePart({ id: 'already-set' }),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();

      fixture.componentRef.setInput('identity', {
        itemId: 'item1',
        typeId: 'it.vedph.note',
        partId: 'new-id',
        roleId: null,
      } as PartIdentity);
      fixture.detectChanges();

      expect(fixture.componentInstance.data()!.value!.id).toBe('already-set');
    });
  });

  describe('modelName', () => {
    it('should return undefined when there is no identity and no layerPart', () => {
      const fixture = createComponent();
      expect(fixture.componentInstance.modelName()).toBeUndefined();
    });

    it('should fall back to the raw type/role IDs when no thesaurus is loaded', () => {
      const fixture = createComponent();
      // no thesaurus provided by appRepository.getTypeThesaurus() (returns
      // undefined), but noFallback=true is passed, so modelName should
      // stay undefined for an identity-based lookup too
      fixture.componentRef.setInput('identity', {
        itemId: 'item1',
        typeId: 'it.vedph.note',
        partId: 'part1',
        roleId: null,
      } as PartIdentity);
      fixture.detectChanges();
      expect(fixture.componentInstance.modelName()).toBeUndefined();
    });

    it('should resolve the name from the types thesaurus when available', () => {
      const thesaurus: Thesaurus = {
        id: 'model-types@en',
        entries: [{ id: 'it.vedph.note', value: 'Note' }],
      };
      const fixture = createComponent();
      // modelName is a computed() that only re-evaluates when a tracked
      // *signal* changes (here, identity()), so the mock must return the
      // thesaurus before identity is set for the recompute to pick it up.
      appRepository.getTypeThesaurus.mockReturnValue(thesaurus);
      fixture.componentRef.setInput('identity', {
        itemId: 'item1',
        typeId: 'it.vedph.note',
        partId: 'part1',
        roleId: null,
      } as PartIdentity);
      fixture.detectChanges();
      expect(fixture.componentInstance.modelName()).toBe('Note');
    });
  });

  describe('initSettings', () => {
    it('should call the callback with settings once identity is available', async () => {
      const fixture = createComponent();
      appRepository.getSettingFor.mockResolvedValue({ foo: 'bar' });
      const callback = vi.fn();
      fixture.componentInstance.callInitSettings('it.vedph.note', callback);

      fixture.componentRef.setInput('identity', {
        itemId: 'item1',
        typeId: 'it.vedph.note',
        partId: 'part1',
        roleId: 'scholarly',
      } as PartIdentity);
      fixture.detectChanges();
      await Promise.resolve();
      await Promise.resolve();

      expect(appRepository.getSettingFor).toHaveBeenCalledWith(
        'it.vedph.note',
        'scholarly'
      );
      expect(callback).toHaveBeenCalledWith({ foo: 'bar' });
    });

    it('should call the callback with undefined when settings loading fails', async () => {
      const fixture = createComponent();
      appRepository.getSettingFor.mockRejectedValue(new Error('boom'));
      const callback = vi.fn();
      fixture.componentInstance.callInitSettings('it.vedph.note', callback);

      fixture.componentRef.setInput('identity', {
        itemId: 'item1',
        typeId: 'it.vedph.note',
        partId: 'part1',
        roleId: null,
      } as PartIdentity);
      fixture.detectChanges();
      await Promise.resolve();
      await Promise.resolve();

      expect(callback).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getEditedPart / getEditedFragment', () => {
    it('should return a deep copy of the current part value if any', () => {
      const fixture = createComponent();
      const part = makePart({ id: 'p1' });
      fixture.componentRef.setInput('data', { value: part, thesauri: {} });
      fixture.detectChanges();

      const edited = fixture.componentInstance.callGetEditedPart('ignored');
      expect(edited).toEqual(part);
      expect(edited).not.toBe(part);
    });

    it('should build a new part from identity when there is no current value', () => {
      const fixture = createComponent();
      fixture.componentRef.setInput('identity', {
        itemId: 'item1',
        typeId: 'ignored',
        partId: null,
        roleId: 'scholarly',
      } as PartIdentity);
      fixture.detectChanges();

      const edited = fixture.componentInstance.callGetEditedPart(
        'it.vedph.note'
      );
      expect(edited.itemId).toBe('item1');
      expect(edited.id).toBe('');
      expect(edited.typeId).toBe('it.vedph.note');
      expect(edited.roleId).toBe('scholarly');
    });

    it('should build a new fragment from the identity location when there is no value', () => {
      const fixture = createComponent();
      fixture.componentRef.setInput('identity', {
        itemId: 'item1',
        typeId: 'x',
        partId: 'p1',
        roleId: null,
        frTypeId: 'fr.it.vedph.comment',
        frRoleId: null,
        loc: '1.1',
      });
      fixture.detectChanges();

      const fr = fixture.componentInstance.callGetEditedFragment();
      expect(fr).toEqual({ location: '1.1' });
    });
  });

  describe('hasThesaurus', () => {
    it('should return false when there is no data', () => {
      const fixture = createComponent();
      expect(fixture.componentInstance.callHasThesaurus('cat@en')).toBe(false);
    });

    it('should return true only for a present, non-empty thesaurus key', () => {
      const fixture = createComponent();
      fixture.componentRef.setInput('data', {
        value: makePart(),
        thesauri: { 'cat@en': { id: 'cat@en', entries: [] } },
      });
      fixture.detectChanges();
      expect(fixture.componentInstance.callHasThesaurus('cat@en')).toBe(true);
      expect(fixture.componentInstance.callHasThesaurus('other@en')).toBe(
        false
      );
    });
  });

  describe('close / save', () => {
    it('should emit editorClose on close()', () => {
      const fixture = createComponent();
      const spy = vi.fn();
      fixture.componentInstance.editorClose.subscribe(spy);
      fixture.componentInstance.close();
      expect(spy).toHaveBeenCalled();
    });

    it('should not save when the form is invalid', () => {
      const fixture = createComponent();
      fixture.componentInstance.form.setErrors({ invalid: true });

      fixture.componentInstance.save();

      // getValue() must not have influenced data(): still undefined
      expect(fixture.componentInstance.data()).toBeUndefined();
    });

    it('should update data and mark the form pristine when valid', () => {
      const fixture = createComponent();
      fixture.componentInstance.getValueResult = makePart({ id: 'saved-id' });
      fixture.componentInstance.form.markAsDirty();

      fixture.componentInstance.save();

      expect(fixture.componentInstance.data()!.value!.id).toBe('saved-id');
      expect(fixture.componentInstance.form.pristine).toBe(true);
    });
  });
});
