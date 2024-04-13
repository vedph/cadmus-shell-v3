import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NamesPartFeatureComponent } from './names-part-feature.component';

describe('NamesPartFeatureComponent', () => {
  let component: NamesPartFeatureComponent;
  let fixture: ComponentFixture<NamesPartFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NamesPartFeatureComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NamesPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
