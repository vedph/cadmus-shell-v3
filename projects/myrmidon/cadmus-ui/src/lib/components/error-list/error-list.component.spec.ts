import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ErrorListComponent } from './error-list.component';

describe('ErrorListComponent', () => {
  let component: ErrorListComponent;
  let fixture: ComponentFixture<ErrorListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default errors to undefined', () => {
    expect(component.errors()).toBeUndefined();
  });

  it('should render each error message', () => {
    fixture.componentRef.setInput('errors', ['first error', 'second error']);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('first error');
    expect(text).toContain('second error');
  });

  it('should render nothing when errors is empty', () => {
    fixture.componentRef.setInput('errors', []);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent?.trim() ?? '';
    expect(text).toBe('');
  });
});
