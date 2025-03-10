import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { PartsScopeEditorComponent } from './parts-scope-editor.component';

describe('PartsScopeEditorComponent', () => {
  let component: PartsScopeEditorComponent;
  let fixture: ComponentFixture<PartsScopeEditorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [PartsScopeEditorComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PartsScopeEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
