import {
  async,
  ComponentFixture,
  TestBed,
  waitForAsync,
} from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CadmusUiModule } from '@myrmidon/cadmus-ui';
import { RouterTestingModule } from '@angular/router/testing';
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
        RouterTestingModule,
        NgeMonacoModule,
        NgeMarkdownModule,
        CadmusUiModule,
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
      declarations: [
        CurrentItemBarComponent,
        WitnessesFragmentComponent,
        WitnessesFragmentFeatureComponent,
      ],
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
