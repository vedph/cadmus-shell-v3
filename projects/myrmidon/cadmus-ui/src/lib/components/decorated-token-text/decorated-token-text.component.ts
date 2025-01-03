import { Component, OnInit, ViewChild, ElementRef, Input } from '@angular/core';

import { SafeHtmlPipe } from '@myrmidon/ngx-tools';

import { TokenLocation, TextLayerService } from '@myrmidon/cadmus-core';

/**
 * Decorated token-based text visualizer. This is used when editing
 * token-based text layers.
 */
@Component({
  selector: 'cadmus-decorated-token-text',
  templateUrl: './decorated-token-text.component.html',
  styleUrls: ['./decorated-token-text.component.css'],
  imports: [SafeHtmlPipe],
})
export class DecoratedTokenTextComponent implements OnInit {
  @ViewChild('textElem') _textElement?: ElementRef;
  private _baseText: string;
  private _locations: TokenLocation[];
  private _selectedLoc?: TokenLocation;

  /**
   * The base text.
   */
  @Input()
  public get baseText(): string {
    return this._baseText;
  }
  public set baseText(value: string) {
    this._baseText = value || '';
    this.decorate();
  }

  /**
   * The token-based locations of all the fragments in the layer.
   */
  @Input()
  public get locations(): TokenLocation[] {
    return this._locations;
  }
  public set locations(value: TokenLocation[]) {
    this._locations = value || [];
    this.decorate();
  }

  /**
   * A selected token-based location.
   */
  @Input()
  public get selectedLocation(): TokenLocation | undefined {
    return this._selectedLoc;
  }
  public set selectedLocation(value: TokenLocation | undefined) {
    this._selectedLoc = value;
    this.decorate();
  }

  public text?: string; // rendered HTML text

  constructor(private _textLayerService: TextLayerService) {
    this._baseText = '';
    this._locations = [];
  }

  public ngOnInit(): void {
    this.decorate();
  }

  private decorate(): void {
    this.text = this._textLayerService.render(
      this._baseText,
      this._locations,
      this._selectedLoc
    );
  }
}
