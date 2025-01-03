import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetadataPartComponent } from './metadata-part.component';

describe('MetadataPartComponent', () => {
  let component: MetadataPartComponent;
  let fixture: ComponentFixture<MetadataPartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [MetadataPartComponent]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MetadataPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
