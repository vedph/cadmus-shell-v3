import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { BibAuthorsEditorComponent } from './bib-authors-editor.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('BibAuthorsEditorComponent', () => {
  let component: BibAuthorsEditorComponent;
  let fixture: ComponentFixture<BibAuthorsEditorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        NoopAnimationsModule,
        BibAuthorsEditorComponent,
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BibAuthorsEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
