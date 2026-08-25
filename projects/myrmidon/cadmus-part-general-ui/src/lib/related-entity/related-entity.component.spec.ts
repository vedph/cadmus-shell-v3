import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { RelatedEntityComponent } from './related-entity.component';
import { AssertedCompositeId } from '@myrmidon/cadmus-refs-asserted-ids';
import { ItemService } from '@myrmidon/cadmus-api';
import { RelatedEntity } from '../historical-events-part';

describe('RelatedEntityComponent', () => {
  let component: RelatedEntityComponent;
  let fixture: ComponentFixture<RelatedEntityComponent>;

  const id: AssertedCompositeId = {
    target: {
      gid: 'gid1',
      label: 'label1',
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RelatedEntityComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {
          provide: ItemService,
          useValue: { searchPins: vi.fn().mockReturnValue(of({ value: { items: [] } })) },
        },
        { provide: 'indexLookupDefinitions', useValue: {} },
      ],
    });
    fixture = TestBed.createComponent(RelatedEntityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('resets the form when entity is undefined', () => {
    fixture.componentRef.setInput('entity', undefined);
    fixture.detectChanges();
    expect(component.form.invalid).toBe(true);
  });

  it('updates the form when entity is set', () => {
    const entity: RelatedEntity = {
      relation: 'rel1',
      id,
    };
    fixture.componentRef.setInput('entity', entity);
    fixture.detectChanges();

    expect(component.relation.value).toBe('rel1');
    expect(component.id.value).toEqual(id);
    expect(component.form.pristine).toBe(true);
  });

  it('updates id control on onIdChange and marks it dirty', () => {
    component.onIdChange(id);
    expect(component.id.value).toEqual(id);
    expect(component.id.dirty).toBe(true);
  });

  it('does not save when form is invalid', () => {
    fixture.componentRef.setInput('entity', undefined);
    fixture.detectChanges();
    const before = component.entity();
    component.save();
    expect(component.entity()).toBe(before);
  });

  it('saves trimmed relation and id when form is valid', () => {
    component.relation.setValue('  rel1  ');
    component.id.setValue(id);

    component.save();

    expect(component.entity()).toEqual({
      relation: 'rel1',
      id,
    });
  });

  it('emits editorClose on cancel', () => {
    let emitted = false;
    component.editorClose.subscribe(() => (emitted = true));
    component.cancel();
    expect(emitted).toBe(true);
  });
});
