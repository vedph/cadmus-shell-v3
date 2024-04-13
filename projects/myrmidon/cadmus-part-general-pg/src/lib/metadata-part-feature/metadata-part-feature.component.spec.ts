import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetadataPartFeatureComponent } from './metadata-part-feature.component';

describe('MetadataPartFeatureComponent', () => {
  let component: MetadataPartFeatureComponent;
  let fixture: ComponentFixture<MetadataPartFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MetadataPartFeatureComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MetadataPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
