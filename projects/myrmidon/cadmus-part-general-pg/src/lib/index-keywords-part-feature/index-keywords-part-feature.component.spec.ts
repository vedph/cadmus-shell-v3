import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { IndexKeywordsPartFeatureComponent } from './index-keywords-part-feature.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { INDEX_KEYWORDS_PART_TYPEID } from '@myrmidon/cadmus-part-general-ui';

describe('IndexKeywordsPartFeatureComponent', () => {
  let component: IndexKeywordsPartFeatureComponent;
  let fixture: ComponentFixture<IndexKeywordsPartFeatureComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        IndexKeywordsPartFeatureComponent,
      ],
      providers: [
        {
          provide: 'partEditorKeys',
          useValue: {
            [INDEX_KEYWORDS_PART_TYPEID]: {
              part: 'general',
            },
          },
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IndexKeywordsPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
