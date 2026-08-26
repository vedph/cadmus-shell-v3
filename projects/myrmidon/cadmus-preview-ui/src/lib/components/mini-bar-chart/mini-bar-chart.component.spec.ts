import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import {
  MiniBarChartComponent,
  MiniBarChartItem,
} from './mini-bar-chart.component';

function mockRect(width: number, height: number): DOMRect {
  return {
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;
}

describe('MiniBarChartComponent', () => {
  let component: MiniBarChartComponent;
  let fixture: ComponentFixture<MiniBarChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiniBarChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MiniBarChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //#region totalValue / normalizedData
  it('totalValue should be 0 for an empty data set', () => {
    expect(component.totalValue()).toBe(0);
  });

  it('totalValue should sum all item values', () => {
    fixture.componentRef.setInput('data', [
      { label: 'a', value: 2 },
      { label: 'b', value: 3 },
    ] as MiniBarChartItem[]);
    fixture.detectChanges();
    expect(component.totalValue()).toBe(5);
  });

  it('normalizedData should preserve an explicit color', () => {
    fixture.componentRef.setInput('data', [
      { label: 'a', value: 1, color: '#123456' },
    ] as MiniBarChartItem[]);
    fixture.detectChanges();
    expect(component.normalizedData()[0].color).toBe('#123456');
  });

  it('normalizedData should generate distinct colors when none is given', () => {
    fixture.componentRef.setInput('data', [
      { label: 'a', value: 1 },
      { label: 'b', value: 1 },
    ] as MiniBarChartItem[]);
    fixture.detectChanges();
    const [a, b] = component.normalizedData();
    expect(a.color).toMatch(/^hsl\(/);
    expect(b.color).toMatch(/^hsl\(/);
    // golden-ratio hue distribution: different indices get different hues
    expect(a.color).not.toBe(b.color);
  });
  //#endregion

  //#region sizing: getStart / getWidth / getHeight (horizontal, the default)
  describe('bar sizing (horizontal, the default)', () => {
    beforeEach(() => {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
        mockRect(200, 50),
      );
      component.onResize();
      fixture.componentRef.setInput('data', [
        { label: 'a', value: 1 },
        { label: 'b', value: 3 },
      ] as MiniBarChartItem[]);
      fixture.detectChanges();
    });

    it('should size the chart from the parent element rect', () => {
      expect(component.width()).toBe(200);
      expect(component.height()).toBe(50);
      expect(component.viewBox()).toBe('0 0 200 50');
    });

    it('getWidth should split the chart width proportionally to each value', () => {
      const items = component.normalizedData();
      // total value 4, chart width 200 -> a: 50, b: 150
      expect(component.getWidth(items[0])).toBe(50);
      expect(component.getWidth(items[1])).toBe(150);
    });

    it('getHeight should equal the full chart height for every bar', () => {
      const items = component.normalizedData();
      expect(component.getHeight(items[0])).toBe(50);
      expect(component.getHeight(items[1])).toBe(50);
    });

    it('getStart should return the cumulative width of the preceding bars', () => {
      expect(component.getStart(0)).toBe(0);
      expect(component.getStart(1)).toBe(50);
    });

    it('canShowLabel should require at least 40px of bar size', () => {
      fixture.componentRef.setInput('data', [
        { label: 'a', value: 1 },
        { label: 'b', value: 1 },
        { label: 'c', value: 18 },
      ] as MiniBarChartItem[]);
      fixture.detectChanges();
      // total 20, width 200 -> a,b: 10px each (hidden), c: 180px (shown)
      const items = component.normalizedData();
      expect(component.canShowLabel(items[0])).toBe(false);
      expect(component.canShowLabel(items[2])).toBe(true);
    });

    it('getLabelX/getLabelY should center the label within the bar', () => {
      const items = component.normalizedData();
      // bar 1 (b): start 50, width 150 -> center x = 125
      expect(component.getLabelX(1, items[1])).toBe(125);
      expect(component.getLabelY(1, items[1])).toBe(25); // half of chart height
    });
  });

  describe('bar sizing (vertical option)', () => {
    beforeEach(() => {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
        mockRect(40, 100),
      );
      component.onResize();
      fixture.componentRef.setInput('options', { vertical: true });
      fixture.componentRef.setInput('data', [
        { label: 'a', value: 1 },
        { label: 'b', value: 1 },
      ] as MiniBarChartItem[]);
      fixture.detectChanges();
    });

    it('getWidth should equal the full chart width for every bar', () => {
      const items = component.normalizedData();
      expect(component.getWidth(items[0])).toBe(40);
      expect(component.getWidth(items[1])).toBe(40);
    });

    it('getHeight should split the chart height proportionally to each value', () => {
      const items = component.normalizedData();
      expect(component.getHeight(items[0])).toBe(50);
      expect(component.getHeight(items[1])).toBe(50);
    });

    it('getLabelX/getLabelY should center the label within the bar vertically', () => {
      const items = component.normalizedData();
      expect(component.getLabelX(1, items[1])).toBe(20); // half of chart width
      expect(component.getLabelY(1, items[1])).toBe(75); // start 50 + half of 50
    });
  });

  it('getWidth should be 0 for every bar when the total value is 0', () => {
    fixture.componentRef.setInput('data', [
      { label: 'a', value: 0 },
    ] as MiniBarChartItem[]);
    fixture.detectChanges();
    expect(component.getWidth(component.normalizedData()[0])).toBe(0);
  });
  //#endregion

  //#region getContrastColor
  describe('getContrastColor', () => {
    it('should return black text for a light background', () => {
      expect(component.getContrastColor('#ffffff')).toBe('#000000');
    });

    it('should return white text for a dark background', () => {
      expect(component.getContrastColor('#000000')).toBe('#FFFFFF');
    });

    it('should accept a color without a leading #', () => {
      expect(component.getContrastColor('ffffff')).toBe('#000000');
    });

    // Documents current behavior rather than "fixing" it: getContrastColor
    // assumes a 6-digit hex string and does not expand 3-digit CSS
    // shorthand hex (e.g. "#fff", which is valid CSS). "#fff".substr(2,2)
    // only has 1 char left ('f') and substr(4,2) has none, so green/blue
    // come out far too low, skewing the luminance estimate away from what
    // a real white background would give. Not changed here because the
    // only colors actually fed into this method by this library (see
    // normalizedData()/generateColor() above, and layer colors built as
    // '#' + 6-hex-digit in TextPreviewComponent.assignLayerColors) are
    // always 6-digit hex or 'transparent', so shorthand hex never reaches
    // it in practice; flagged in case a future caller passes one.
    it('should mis-parse a 3-digit shorthand hex color (documented, not fixed)', () => {
      // "#fff" is pure white and should ideally yield '#000000', but the
      // shorthand-unaware parsing above yields a much lower luminance
      expect(component.getContrastColor('#fff')).not.toBe('#000000');
    });
  });
  //#endregion

  //#region trackByItem
  it('trackByItem should use the item id when present', () => {
    expect(
      component.trackByItem(0, { id: 'x1', label: 'a', value: 1 }),
    ).toBe('x1');
  });

  it('trackByItem should fall back to the label when id is absent', () => {
    expect(component.trackByItem(0, { label: 'a', value: 1 })).toBe('a');
  });
  //#endregion

  //#region getLabelTransform
  // getLabelTransform ignores both of its parameters and always returns an
  // empty string - it looks like an unfinished stub (e.g. for a future
  // rotated-label feature) rather than a bug per se, since an empty
  // transform is harmless in the SVG template. Documenting current
  // behavior instead of guessing at an intended transform.
  it('getLabelTransform should currently always return an empty string', () => {
    expect(component.getLabelTransform(0, { label: 'a', value: 1 })).toBe('');
    expect(component.getLabelTransform(5, { label: 'z', value: 99 })).toBe('');
  });
  //#endregion

  //#region mouse interaction: tooltip and click
  it('onMouseEnter should show a tooltip with the item label and value', () => {
    const item: MiniBarChartItem = { label: 'a', value: 5 };
    component.onMouseEnter(item, { clientX: 10, clientY: 20 } as MouseEvent);

    expect(component.tooltipVisible()).toBe(true);
    expect(component.tooltipContent()).toBe('a: 5');
    expect(component.tooltipPosition()).toEqual({ x: 10, y: 5 });
  });

  it('onMouseLeave should hide the tooltip', () => {
    component.onMouseEnter(
      { label: 'a', value: 5 },
      { clientX: 0, clientY: 0 } as MouseEvent,
    );
    component.onMouseLeave();
    expect(component.tooltipVisible()).toBe(false);
  });

  it('onClick should emit itemClicked and briefly mark the item active', () => {
    vi.useFakeTimers();
    const emitted: MiniBarChartItem[] = [];
    component.itemClicked.subscribe((i) => emitted.push(i));
    const item: MiniBarChartItem = { label: 'a', value: 1 };

    component.onClick(item);

    expect(component.activeItem()).toBe(item);
    expect(emitted).toEqual([item]);

    vi.advanceTimersByTime(300);
    expect(component.activeItem()).toBeNull();
    vi.useRealTimers();
  });
  //#endregion

  //#region zoom and pan
  describe('zoom and pan (options.zoomAndPan enabled)', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('options', { zoomAndPan: true });
      fixture.detectChanges();
    });

    it('should start dragging on mousedown and pan on mousemove', () => {
      component.onMouseDown({ clientX: 100, clientY: 50 } as MouseEvent);
      expect(component.isDragging()).toBe(true);

      component.onMouseMove({ clientX: 110, clientY: 60 } as MouseEvent);
      expect(component.pan()).toEqual({ x: 10, y: 10 });
    });

    it('should not pan on mousemove when not dragging', () => {
      component.onMouseMove({ clientX: 999, clientY: 999 } as MouseEvent);
      expect(component.pan()).toEqual({ x: 0, y: 0 });
    });

    it('should stop dragging on mouseup', () => {
      component.onMouseDown({ clientX: 0, clientY: 0 } as MouseEvent);
      component.onMouseUp();
      expect(component.isDragging()).toBe(false);
    });

    it('should reset zoom and pan on double click', () => {
      component.onMouseDown({ clientX: 0, clientY: 0 } as MouseEvent);
      component.onMouseMove({ clientX: 20, clientY: 20 } as MouseEvent);
      expect(component.pan()).toEqual({ x: 20, y: 20 });

      component.onDoubleClick();

      expect(component.zoom()).toBe(1);
      expect(component.pan()).toEqual({ x: 0, y: 0 });
    });

    it('should zoom in on wheel-up, clamped to the max zoom of 5', () => {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
        mockRect(100, 100),
      );
      const preventDefault = vi.fn();
      for (let i = 0; i < 40; i++) {
        component.onWheel({
          deltaY: -1,
          clientX: 50,
          clientY: 50,
          preventDefault,
        } as unknown as WheelEvent);
      }
      expect(preventDefault).toHaveBeenCalled();
      expect(component.zoom()).toBe(5);
    });

    it('should zoom out on wheel-down, clamped to the min zoom of 0.1', () => {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
        mockRect(100, 100),
      );
      for (let i = 0; i < 60; i++) {
        component.onWheel({
          deltaY: 1,
          clientX: 50,
          clientY: 50,
          preventDefault: vi.fn(),
        } as unknown as WheelEvent);
      }
      expect(component.zoom()).toBeCloseTo(0.1, 5);
    });
  });

  it('should not start dragging or zoom when zoomAndPan is not enabled', () => {
    component.onMouseDown({ clientX: 0, clientY: 0 } as MouseEvent);
    expect(component.isDragging()).toBe(false);

    component.onWheel({
      deltaY: -1,
      clientX: 0,
      clientY: 0,
      preventDefault: vi.fn(),
    } as unknown as WheelEvent);
    expect(component.zoom()).toBe(1);
  });
  //#endregion

  //#region transform computed
  it('transform should be empty when zoomAndPan is not enabled', () => {
    expect(component.transform()).toBe('');
  });

  it('transform should reflect pan/zoom when zoomAndPan is enabled', () => {
    fixture.componentRef.setInput('options', { zoomAndPan: true });
    fixture.detectChanges();
    component.onMouseDown({ clientX: 0, clientY: 0 } as MouseEvent);
    component.onMouseMove({ clientX: 5, clientY: 5 } as MouseEvent);
    expect(component.transform()).toBe('translate(5, 5) scale(1)');
  });
  //#endregion
});
