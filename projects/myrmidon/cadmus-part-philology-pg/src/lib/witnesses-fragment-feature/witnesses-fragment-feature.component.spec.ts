import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { WitnessesFragmentFeatureComponent } from './witnesses-fragment-feature.component';
import {
  WitnessesFragmentComponent,
  WITNESSES_FRAGMENT_TYPEID,
} from '@myrmidon/cadmus-part-philology-ui';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import { NgeMonacoModule } from '@cisstech/nge/monaco';
import { NgeMarkdownModule } from '@cisstech/nge/markdown';

describe('WitnessesFragmentFeatureComponent', () => {
  let component: WitnessesFragmentFeatureComponent;
  let fixture: ComponentFixture<WitnessesFragmentFeatureComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        NgeMonacoModule,
        NgeMarkdownModule,
        WitnessesFragmentFeatureComponent,
      ],
      // https://github.com/angular/components/issues/14668
      providers: [
        {
          provide: 'partEditorKeys',
          useValue: {
            [WITNESSES_FRAGMENT_TYPEID]: {
              part: 'philology',
            },
          },
        },
      ],
      declarations: [CurrentItemBarComponent, WitnessesFragmentComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WitnessesFragmentFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
