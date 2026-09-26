import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HelpLinkComponent } from './help-link.component';

describe('HelpLinkComponent', () => {
  let fixture: ComponentFixture<HelpLinkComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HelpLinkComponent] });
    fixture = TestBed.createComponent(HelpLinkComponent);
  });

  function getLink(): HTMLAnchorElement | null {
    return fixture.nativeElement.querySelector('a');
  }

  it('should show nothing without url', () => {
    fixture.detectChanges();
    expect(getLink()).toBeNull();
  });

  it('should show nothing with null url', () => {
    fixture.componentRef.setInput('url', null);
    fixture.detectChanges();
    expect(getLink()).toBeNull();
  });

  it('should show a link opening in a new tab with url', () => {
    fixture.componentRef.setInput('url', 'https://x.org/help.html');
    fixture.detectChanges();
    const a = getLink()!;
    expect(a).toBeTruthy();
    expect(a.getAttribute('href')).toBe('https://x.org/help.html');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toContain('noopener');
  });

  it('should hide the link when url is reset', () => {
    fixture.componentRef.setInput('url', 'https://x.org/help.html');
    fixture.detectChanges();
    fixture.componentRef.setInput('url', undefined);
    fixture.detectChanges();
    expect(getLink()).toBeNull();
  });
});
