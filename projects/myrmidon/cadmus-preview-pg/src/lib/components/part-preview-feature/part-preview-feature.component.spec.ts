import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartPreviewFeatureComponent } from './part-preview-feature.component';

describe('PartPreviewFeatureComponent', () => {
  let component: PartPreviewFeatureComponent;
  let fixture: ComponentFixture<PartPreviewFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [PartPreviewFeatureComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(PartPreviewFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
