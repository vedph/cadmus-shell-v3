import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { DecoratedTokenTextComponent } from './decorated-token-text.component';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SafeHtmlPipe } from '@myrmidon/ngx-tools';

describe('DecoratedTokenTextComponent', () => {
  let component: DecoratedTokenTextComponent;
  let fixture: ComponentFixture<DecoratedTokenTextComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        ReactiveFormsModule,
        DecoratedTokenTextComponent,
        SafeHtmlPipe,
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DecoratedTokenTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
