import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

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
        TokenTextPartComponent,
      ],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
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
