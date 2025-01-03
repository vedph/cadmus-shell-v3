import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartPreviewComponent } from './part-preview.component';

describe('PartPreviewComponent', () => {
  let component: PartPreviewComponent;
  let fixture: ComponentFixture<PartPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [PartPreviewComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(PartPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
