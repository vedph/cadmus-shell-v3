import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphDemoPageComponent } from './graph-demo-page.component';

describe('GraphDemoPageComponent', () => {
  let component: GraphDemoPageComponent;
  let fixture: ComponentFixture<GraphDemoPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphDemoPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GraphDemoPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
