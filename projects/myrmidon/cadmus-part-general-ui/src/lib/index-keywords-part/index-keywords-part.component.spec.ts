import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { IndexKeywordsPartComponent } from './index-keywords-part.component';
import { IndexKeywordComponent } from '../index-keyword/index-keyword.component';

describe('IndexKeywordsPartComponent', () => {
  let component: IndexKeywordsPartComponent;
  let fixture: ComponentFixture<IndexKeywordsPartComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        IndexKeywordComponent,
        IndexKeywordsPartComponent,
      ],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IndexKeywordsPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
