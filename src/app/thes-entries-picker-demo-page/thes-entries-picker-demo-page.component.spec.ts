import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThesEntriesPickerDemoPageComponent } from './thes-entries-picker-demo-page.component';

describe('ThesEntriesPickerDemoPageComponent', () => {
  let component: ThesEntriesPickerDemoPageComponent;
  let fixture: ComponentFixture<ThesEntriesPickerDemoPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThesEntriesPickerDemoPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThesEntriesPickerDemoPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
