import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MiniBarChartComponent } from './mini-bar-chart.component';

describe('MiniBarChartComponent', () => {
  let component: MiniBarChartComponent;
  let fixture: ComponentFixture<MiniBarChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiniBarChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MiniBarChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
