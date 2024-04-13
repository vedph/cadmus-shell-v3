import { async, ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CadmusUiModule } from '@myrmidon/cadmus-ui';
import { NgeMonacoModule } from '@cisstech/nge/monaco';

import { TokenTextPartComponent } from './token-text-part.component';

describe('TokenTextPartComponent', () => {
  let component: TokenTextPartComponent;
  let fixture: ComponentFixture<TokenTextPartComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        BrowserAnimationsModule,
        NgeMonacoModule,
        CadmusUiModule,
      ],
      declarations: [TokenTextPartComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TokenTextPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
