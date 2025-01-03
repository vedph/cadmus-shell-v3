import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThesaurusImportComponent } from './thesaurus-import.component';

describe('ThesaurusImportComponent', () => {
  let component: ThesaurusImportComponent;
  let fixture: ComponentFixture<ThesaurusImportComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [ThesaurusImportComponent]
});
    fixture = TestBed.createComponent(ThesaurusImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
