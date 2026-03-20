import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartDefinitionEditorComponent } from './part-definition-editor.component';

describe('PartDefinitionEditorComponent', () => {
  let component: PartDefinitionEditorComponent;
  let fixture: ComponentFixture<PartDefinitionEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartDefinitionEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PartDefinitionEditorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
