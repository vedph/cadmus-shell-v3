import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { ApparatusFragmentFeatureComponent } from './apparatus-fragment-feature.component';
import {
  ApparatusFragmentComponent,
  APPARATUS_FRAGMENT_TYPEID,
  ApparatusEntryComponent,
} from '@myrmidon/cadmus-part-philology-ui';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';

describe('ApparatusFragmentFeatureComponent', () => {
  let component: ApparatusFragmentFeatureComponent;
  let fixture: ComponentFixture<ApparatusFragmentFeatureComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        BrowserAnimationsModule,
        ApparatusFragmentFeatureComponent,
      ],
      // https://github.com/angular/components/issues/14668
      providers: [
        {
          provide: 'partEditorKeys',
          useValue: {
            [APPARATUS_FRAGMENT_TYPEID]: {
              part: 'philology',
            },
          },
        },
      ],
      declarations: [
        CurrentItemBarComponent,
        ApparatusEntryComponent,
        ApparatusFragmentComponent,
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ApparatusFragmentFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
