import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { BibliographyPartFeatureComponent } from './bibliography-part-feature.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BIBLIOGRAPHY_PART_TYPEID } from '@myrmidon/cadmus-part-general-ui';

describe('BibliographyPartFeatureComponent', () => {
  let component: BibliographyPartFeatureComponent;
  let fixture: ComponentFixture<BibliographyPartFeatureComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        BibliographyPartFeatureComponent,
      ],
      providers: [
        {
          provide: 'partEditorKeys',
          useValue: {
            [BIBLIOGRAPHY_PART_TYPEID]: {
              part: 'general',
            },
          },
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BibliographyPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
