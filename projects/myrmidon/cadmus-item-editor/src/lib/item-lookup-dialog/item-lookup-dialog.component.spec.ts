import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemLookupDialogComponent } from './item-lookup-dialog.component';

describe('ItemLookupDialogComponent', () => {
  let component: ItemLookupDialogComponent;
  let fixture: ComponentFixture<ItemLookupDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemLookupDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItemLookupDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
