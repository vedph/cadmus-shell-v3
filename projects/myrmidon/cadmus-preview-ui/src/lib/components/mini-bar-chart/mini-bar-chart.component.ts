import {
  Component,
  ElementRef,
  HostListener,
  viewChild,
  input,
  output,
  signal,
  effect,
  computed,
  AfterViewInit,
} from '@angular/core';


export interface MiniBarChartItem {
  id?: string;
  label: string;
  value: number;
  color?: string;
}

export interface MiniBarChartOptions {
  vertical?: boolean;
  noLabels?: boolean;
  zoomAndPan?: boolean;
}

/**
 * A small bar chart component that displays a set of items as bars.
 * Each bar represents a value and can be clicked to emit an event.
 */
@Component({
  selector: 'minichart-bar',
  standalone: true,
  imports: [],
  templateUrl: './mini-bar-chart.component.html',
  styleUrl: './mini-bar-chart.component.scss',
})
export class MiniBarChartComponent implements AfterViewInit {
  // inputs
  public readonly data = input<MiniBarChartItem[]>([]);
  public readonly options = input<MiniBarChartOptions>({});

  // output
  public readonly itemClicked = output<MiniBarChartItem>();

  // viewChild for SVG element
  chartSvg = viewChild<ElementRef>('chartSvg');

  // state signals
  public readonly width = signal(0);
  public readonly height = signal(0);
  public readonly tooltipVisible = signal(false);
  public readonly tooltipContent = signal('');
  public readonly tooltipPosition = signal({ x: 0, y: 0 });
  public readonly activeItem = signal<MiniBarChartItem | null>(null);
  public readonly pan = signal({ x: 0, y: 0 });
  public readonly zoom = signal(1);
  public readonly isDragging = signal(false);
  public readonly dragStart = signal({ x: 0, y: 0 });
  public readonly hoveredBarRect = signal<DOMRect | null>(null);

  // computed values
  public readonly totalValue = computed(() => {
    return this.data().reduce((sum, item) => sum + item.value, 0);
  });

  public readonly normalizedData = computed(() => {
    return this.data().map((item, index) => ({
      ...item,
      color: item.color || this.generateColor(index),
    }));
  });

  public readonly chartWidth = computed(() => {
    return this.width();
  });

  public readonly chartHeight = computed(() => {
    return this.height();
  });

  public readonly viewBox = computed(() => {
    return `0 0 ${this.width()} ${this.height()}`;
  });

  public readonly transform = computed(() => {
    if (this.options()?.zoomAndPan) {
      return `translate(${this.pan().x}, ${
        this.pan().y
      }) scale(${this.zoom()})`;
    }
    return '';
  });

  // lifecycle hooks
  constructor() {
    effect(() => {
      this.updateChartDimensions();
    });
  }

  ngAfterViewInit() {
    // Set initial dimensions after view initialization
    setTimeout(() => {
      this.updateChartDimensions();
    }, 0);
  }

  @HostListener('window:resize')
  public onResize() {
    this.updateChartDimensions();
  }

  // event handlers
  public onMouseEnter(item: MiniBarChartItem, event: MouseEvent) {
    this.tooltipContent.set(`${item.label}: ${item.value}`);
    this.tooltipPosition.set({
      x: event.clientX,
      y: event.clientY - 15,
    });
    this.tooltipVisible.set(true);
  }

  public onMouseLeave() {
    this.tooltipVisible.set(false);
  }

  public onClick(item: MiniBarChartItem) {
    this.activeItem.set(item);
    this.itemClicked.emit(item);

    // Reset active item after visual feedback
    setTimeout(() => {
      this.activeItem.set(null);
    }, 300);
  }

  @HostListener('mousedown', ['$event'])
  public onMouseDown(event: MouseEvent) {
    if (this.options()?.zoomAndPan) {
      this.isDragging.set(true);
      this.dragStart.set({
        x: event.clientX - this.pan().x,
        y: event.clientY - this.pan().y,
      });
    }
  }

  @HostListener('mousemove', ['$event'])
  public onMouseMove(event: MouseEvent) {
    if (this.isDragging() && this.options()?.zoomAndPan) {
      this.pan.set({
        x: event.clientX - this.dragStart().x,
        y: event.clientY - this.dragStart().y,
      });
    }
  }

  @HostListener('mouseup')
  @HostListener('mouseleave')
  public onMouseUp() {
    this.isDragging.set(false);
  }

  @HostListener('wheel', ['$event'])
  public onWheel(event: WheelEvent) {
    if (this.options()?.zoomAndPan) {
      event.preventDefault();
      const delta = event.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(5, this.zoom() * delta));

      const rect = this.chartSvg()!.nativeElement.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const zoomFactor = newZoom / this.zoom();
      const newPanX = mouseX - (mouseX - this.pan().x) * zoomFactor;
      const newPanY = mouseY - (mouseY - this.pan().y) * zoomFactor;

      this.zoom.set(newZoom);
      this.pan.set({ x: newPanX, y: newPanY });
    }
  }

  @HostListener('dblclick')
  public onDoubleClick() {
    if (this.options()?.zoomAndPan) {
      this.resetZoomAndPan();
    }
  }

  // helper methods
  private resetZoomAndPan() {
    this.zoom.set(1);
    this.pan.set({ x: 0, y: 0 });
  }

  private updateChartDimensions() {
    if (this.chartSvg()) {
      const element = this.chartSvg()!.nativeElement;
      const parentElement = element.parentElement;

      if (parentElement) {
        const containerRect = parentElement.getBoundingClientRect();
        // Use the container's dimensions without causing expansion
        this.width.set(containerRect.width);
        this.height.set(containerRect.height);
      }
    }
  }

  public getStart(index: number): number {
    const items = this.normalizedData();
    let start = 0;

    for (let i = 0; i < index; i++) {
      start += this.getSize(items[i]);
    }

    return start;
  }

  private getSize(item: MiniBarChartItem): number {
    if (this.totalValue() === 0) return 0;

    return (
      (item.value / this.totalValue()) *
      (this.options()?.vertical ? this.chartHeight() : this.chartWidth())
    );
  }

  public getWidth(item: MiniBarChartItem): number {
    return this.options()?.vertical ? this.chartWidth() : this.getSize(item);
  }

  public getHeight(item: MiniBarChartItem): number {
    return this.options()?.vertical ? this.getSize(item) : this.chartHeight();
  }

  public canShowLabel(item: MiniBarChartItem): boolean {
    const size = this.getSize(item);
    const minSize = 40; // minimum size in pixels to show label
    return size >= minSize;
  }

  public getLabelX(index: number, item: MiniBarChartItem): number {
    if (this.options()?.vertical) {
      return this.chartWidth() / 2;
    } else {
      return this.getStart(index) + this.getSize(item) / 2;
    }
  }

  public getLabelY(index: number, item: MiniBarChartItem): number {
    if (this.options()?.vertical) {
      return this.getStart(index) + this.getSize(item) / 2;
    } else {
      return this.chartHeight() / 2;
    }
  }

  public getLabelTransform(index: number, item: MiniBarChartItem): string {
    return '';
  }

  public getContrastColor(backgroundColor: string): string {
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) || 0;
    const g = parseInt(hex.substr(2, 2), 16) || 0;
    const b = parseInt(hex.substr(4, 2), 16) || 0;

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }

  private generateColor(index: number): string {
    const goldenRatioConjugate = 0.618033988749895;
    let h = 0.5;
    h += index * goldenRatioConjugate;
    h %= 1;
    const hue = Math.floor(h * 360);
    const saturation = 65 + (index % 3) * 5;
    const lightness = 75 - (index % 3) * 5;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
}
