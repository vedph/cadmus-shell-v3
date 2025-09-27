import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { HistoricalDatePartFeatureComponent } from './historical-date-part-feature.component';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import {
  HistoricalDatePartComponent,
  HISTORICAL_DATE_PART_TYPEID,
} from '@myrmidon/cadmus-part-general-ui';

describe('HistoricalDatePartFeatureComponent', () => {
  let component: HistoricalDatePartFeatureComponent;
  let fixture: ComponentFixture<HistoricalDatePartFeatureComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        HistoricalDatePartFeatureComponent,
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
      declarations: [CurrentItemBarComponent, HistoricalDatePartComponent],
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
