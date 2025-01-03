import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextPreviewFeatureComponent } from './text-preview-feature.component';

describe('TextPreviewFeatureComponent', () => {
  let component: TextPreviewFeatureComponent;
  let fixture: ComponentFixture<TextPreviewFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [TextPreviewFeatureComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(TextPreviewFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
