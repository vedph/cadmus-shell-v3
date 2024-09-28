import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemGenerateDialogComponent } from './item-generate-dialog.component';

describe('ItemGenerateDialogComponent', () => {
  let component: ItemGenerateDialogComponent;
  let fixture: ComponentFixture<ItemGenerateDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemGenerateDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItemGenerateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
