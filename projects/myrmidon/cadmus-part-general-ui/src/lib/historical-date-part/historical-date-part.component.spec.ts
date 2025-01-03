import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { HistoricalDatePartComponent } from './historical-date-part.component';
import { CloseSaveButtonsComponent } from '@myrmidon/cadmus-ui';

describe('HistoricalDatePartComponent', () => {
  let component: HistoricalDatePartComponent;
  let fixture: ComponentFixture<HistoricalDatePartComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        BrowserAnimationsModule,
        CloseSaveButtonsComponent,
        HistoricalDatePartComponent,
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HistoricalDatePartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
