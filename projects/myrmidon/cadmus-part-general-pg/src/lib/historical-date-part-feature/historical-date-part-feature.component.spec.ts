import { async, ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CadmusUiModule } from '@myrmidon/cadmus-ui';

import { HistoricalDatePartFeatureComponent } from './historical-date-part-feature.component';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import {
  HistoricalDatePartComponent,
  HISTORICAL_DATE_PART_TYPEID,
} from '@myrmidon/cadmus-part-general-ui';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CadmusCoreModule } from '@myrmidon/cadmus-core';

describe('HistoricalDatePartFeatureComponent', () => {
  let component: HistoricalDatePartFeatureComponent;
  let fixture: ComponentFixture<HistoricalDatePartFeatureComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        BrowserAnimationsModule,
        RouterTestingModule,
        CadmusCoreModule,
        CadmusUiModule,
      ],
      providers: [
        {
          provide: 'partEditorKeys',
          useValue: {
            [HISTORICAL_DATE_PART_TYPEID]: {
              part: 'general',
            },
          },
        },
      ],
      declarations: [
        CurrentItemBarComponent,
        HistoricalDatePartComponent,
        HistoricalDatePartFeatureComponent,
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HistoricalDatePartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
