import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelatedEntityComponent } from './related-entity.component';

describe('RelatedEntityComponent', () => {
  let component: RelatedEntityComponent;
  let fixture: ComponentFixture<RelatedEntityComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [RelatedEntityComponent]
});
    fixture = TestBed.createComponent(RelatedEntityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
