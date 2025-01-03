import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import {
  CategoriesPartComponent,
  CATEGORIES_PART_TYPEID,
} from '@myrmidon/cadmus-part-general-ui';

import { CategoriesPartFeatureComponent } from './categories-part-feature.component';

describe('CategoriesPartFeatureComponent', () => {
  let component: CategoriesPartFeatureComponent;
  let fixture: ComponentFixture<CategoriesPartFeatureComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        CategoriesPartFeatureComponent,
      ],
      providers: [
        {
          provide: 'partEditorKeys',
          useValue: {
            [CATEGORIES_PART_TYPEID]: {
              part: 'general',
            },
          },
        },
      ],
      declarations: [CurrentItemBarComponent, CategoriesPartComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CategoriesPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
