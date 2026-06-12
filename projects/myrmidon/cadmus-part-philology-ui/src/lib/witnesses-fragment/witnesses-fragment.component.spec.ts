import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { WitnessesFragmentComponent } from './witnesses-fragment.component';
import { provideHttpClient, withXhr } from '@angular/common/http';

xdescribe('WitnessesFragmentComponent', () => {
  let component: WitnessesFragmentComponent;
  let fixture: ComponentFixture<WitnessesFragmentComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        WitnessesFragmentComponent,
      ],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WitnessesFragmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
