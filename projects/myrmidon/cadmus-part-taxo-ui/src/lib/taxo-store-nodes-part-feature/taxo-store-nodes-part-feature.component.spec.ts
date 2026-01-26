import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaxoStoreNodesPartFeatureComponent } from './taxo-store-nodes-part-feature.component';

describe('TaxoStoreNodesPartFeatureComponent', () => {
  let component: TaxoStoreNodesPartFeatureComponent;
  let fixture: ComponentFixture<TaxoStoreNodesPartFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaxoStoreNodesPartFeatureComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaxoStoreNodesPartFeatureComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
