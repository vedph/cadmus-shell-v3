import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExternalIdsPartFeatureComponent } from './external-ids-part-feature.component';

describe('ExternalIdsPartFeatureComponent', () => {
  let component: ExternalIdsPartFeatureComponent;
  let fixture: ComponentFixture<ExternalIdsPartFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExternalIdsPartFeatureComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExternalIdsPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
