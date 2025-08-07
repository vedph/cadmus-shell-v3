import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlagsPartComponent } from './flags-part.component';

describe('FlagsPartComponent', () => {
  let component: FlagsPartComponent;
  let fixture: ComponentFixture<FlagsPartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlagsPartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlagsPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
