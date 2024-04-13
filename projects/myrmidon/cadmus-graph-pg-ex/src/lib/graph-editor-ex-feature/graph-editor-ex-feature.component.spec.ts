import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphEditorExFeatureComponent } from './graph-editor-ex-feature.component';

describe('GraphEditorFeatureComponent', () => {
  let component: GraphEditorExFeatureComponent;
  let fixture: ComponentFixture<GraphEditorExFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GraphEditorExFeatureComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GraphEditorExFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
