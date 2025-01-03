import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlagsEditorFeatureComponent } from './flags-editor-feature.component';

describe('FlagsEditorFeatureComponent', () => {
  let component: FlagsEditorFeatureComponent;
  let fixture: ComponentFixture<FlagsEditorFeatureComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [FlagsEditorFeatureComponent]
});
    fixture = TestBed.createComponent(FlagsEditorFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
