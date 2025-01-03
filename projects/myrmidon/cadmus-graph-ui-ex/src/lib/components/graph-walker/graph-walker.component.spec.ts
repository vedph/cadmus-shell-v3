import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphWalkerComponent } from './graph-walker.component';

describe('GraphWalkerComponent', () => {
  let component: GraphWalkerComponent;
  let fixture: ComponentFixture<GraphWalkerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [GraphWalkerComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(GraphWalkerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
