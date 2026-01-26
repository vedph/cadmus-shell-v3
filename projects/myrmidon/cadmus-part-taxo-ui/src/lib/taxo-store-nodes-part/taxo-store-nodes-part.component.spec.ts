import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaxoStoreNodesPartComponent } from './taxo-store-nodes-part.component';

describe('TaxoStoreNodesPartComponent', () => {
  let component: TaxoStoreNodesPartComponent;
  let fixture: ComponentFixture<TaxoStoreNodesPartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaxoStoreNodesPartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaxoStoreNodesPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
