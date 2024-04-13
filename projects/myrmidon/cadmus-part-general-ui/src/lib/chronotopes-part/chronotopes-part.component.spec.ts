import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChronotopesPartComponent } from './chronotopes-part.component';

describe('ChronotopesPartComponent', () => {
  let component: ChronotopesPartComponent;
  let fixture: ComponentFixture<ChronotopesPartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChronotopesPartComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChronotopesPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
