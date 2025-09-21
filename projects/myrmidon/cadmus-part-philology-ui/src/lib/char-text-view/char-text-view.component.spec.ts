import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CharTextViewComponent } from './char-text-view.component';

describe('CharTextViewComponent', () => {
  let component: CharTextViewComponent;
  let fixture: ComponentFixture<CharTextViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharTextViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CharTextViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
