import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThesEntriesPickerComponent } from './thes-entries-picker.component';

describe('ThesEntriesPickerComponent', () => {
  let component: ThesEntriesPickerComponent;
  let fixture: ComponentFixture<ThesEntriesPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThesEntriesPickerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThesEntriesPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
