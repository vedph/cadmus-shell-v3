import { TestBed, inject } from '@angular/core/testing';

import { TokenLocation } from '../token-location';
import { TextLayerService, SelectedRange } from './text-layer.service';

describe('TextLayerService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TextLayerService],
    });
  });

  it('should be created', inject(
    [TextLayerService],
    (service: TextLayerService) => {
      expect(service).toBeTruthy();
    }
  ));

  /*
   * getLines method
   */
  it('getLines with empty string should return empty array', inject(
    [TextLayerService],
    (service: TextLayerService) => {
      expect(service.getLines('').length).toEqual(0);
    }
  ));

  it('getLines with ws string should return empty line', inject(
    [TextLayerService],
    (service: TextLayerService) => {
      const lines = service.getLines('  ');
      expect(lines.length).toEqual(1);
      expect(lines[0].tokens.length).toEqual(0);
    }
  ));

  it('getLines with single line string should return 1 line', inject(
    [TextLayerService],
    (service: TextLayerService) => {
      const lines = service.getLines('alpha');
      expect(lines.length).toEqual(1);
      const line = lines[0];
      expect(line.y).toEqual(1);
      expect(line.tokens.length).toEqual(1);
    }
  ));

  it('getLines with multiple line string should return N lines', inject(
    [TextLayerService],
    (service: TextLayerService) => {
      const lines = service.getLines('alpha\nbeta gamma');
      expect(lines.length).toEqual(2);

      let line = lines[0];
      expect(line.y).toEqual(1);
      expect(line.tokens.length).toEqual(1);
      expect(line.tokens[0]).toEqual('alpha');

      line = lines[1];
      expect(line.y).toEqual(2);
      expect(line.tokens.length).toEqual(2);
      expect(line.tokens[0]).toEqual('beta');
      expect(line.tokens[1]).toEqual('gamma');
    }
  ));

  /*
   * render method
   */
  it('render with empty text should return empty div', inject(
    [TextLayerService],
    (service: TextLayerService) => {
      const html = service.render('');
      expect(html).toEqual('<div></div>');
    }
  ));

  it('render with 1 line "[alpha]" should return div/p', inject(
    [TextLayerService],
    (service: TextLayerService) => {
      const html = service.render('alpha');
      expect(html).toEqual('<div><p id="y1">alpha</p></div>');
    }
  ));

  it('render with 1 line "[alpha beta]" should return div/p', inject(
    [TextLayerService],
    (service: TextLayerService) => {
      const html = service.render('alpha beta');
      expect(html).toEqual('<div><p id="y1">alpha beta</p></div>');
    }
  ));

  it('render with 2 lines should return div/p*2', inject(
    [TextLayerService],
    (service: TextLayerService) => {
      const html = service.render('alpha\nbeta');
      expect(html).toEqual(
        '<div><p id="y1">alpha</p>' + '<p id="y2">beta</p></div>'
      );
    }
  ));

  it('render with empty text should return empty div', inject(
    [TextLayerService],
    (service: TextLayerService) => {
      const html = service.render('');
      expect(html).toEqual('<div></div>');
    }
  ));

  // single token
  it('render 1 line "[alpha]" should return div/p/span', inject(
    [TextLayerService],
    (service: TextLayerService) => {
      const html = service.render('alpha', [TokenLocation.parse('1.1')!]);
      expect(html).toEqual(
        '<div><p id="y1">' +
          '<span id="f1.1_0" class="fr">alpha</span>' +
          '</p></div>'
      );
    }
  ));

  it('render 1 line "al[pha]" should return div/p/span', inject(
    [TextLayerService],
    (service: TextLayerService) => {
      const html = service.render('alpha', [TokenLocation.parse('1.1@3x3')!]);
      expect(html).toEqual(
        '<div><p id="y1">' +
          'al<span id="f1.1@3x3_0" class="fr">pha</span>' +
          '</p></div>'
      );
    }
  ));

  it('render 1 line "[al]pha" should return div/p/span', inject(
    [TextLayerService],
    (service: TextLayerService) => {
      const html = service.render('alpha', [TokenLocation.parse('1.1@1x2')!]);
      expect(html).toEqual(
        '<div><p id="y1">' +
          '<span id="f1.1@1x2_0" class="fr">al</span>pha' +
          '</p></div>'
      );
    }
  ));

  it('render 1 line "al[p]ha" should return div/p/span', inject(
    [TextLayerService],
    (service: TextLayerService) => {
      const html = service.render('alpha', [TokenLocation.parse('1.1@3x1')!]);
      expect(html).toEqual(
        '<div><p id="y1">' +
          'al<span id="f1.1@3_0" class="fr">p</span>ha' +
          '</p></div>'
      );
    }
  ));

  // multiple tokens in single line
  it('render 1 line "[alpha beta] gamma" should return div/p/span', inject(
    [TextLayerService],
    (service: TextLayerService) => {
      const html = service.render('alpha beta gamma', [
        TokenLocation.parse('1.1-1.2')!,
      ]);
      expect(html).toEqual(
        '<div><p id="y1">' +
          '<span id="f1.1-1.2_0" class="fr">alpha beta</span>' +
          ' gamma</p></div>'
      );
    }
  ));

  it('render 1 line "[alpha beta gamma]" should return div/p/span', inject(
    [TextLayerService],
    (service: TextLayerService) => {
      const html = service.render('alpha beta gamma', [
        TokenLocation.parse('1.1-1.3')!,
      ]);
      expect(html).toEqual(
        '<div><p id="y1">' +
          '<span id="f1.1-1.3_0" class="fr">alpha beta gamma</span>' +
          '</p></div>'
      );
    }
  ));

  it('render 1 line "al[pha beta]" should return div/p/span', inject(
    [TextLayerService],
    (service: TextLayerService) => {
      const html = service.render('alpha beta gamma', [
        TokenLocation.parse('1.1@3x3-1.2')!,
      ]);
      expect(html).toEqual(
        '<div><p id="y1">' +
          'al<span id="f1.1@3x3-1.2_0" class="fr">pha beta</span>' +
          ' gamma</p></div>'
      );
    }
  ));

  it('render 1 line "[alpha be]ta gamma" should return div/p/span', inject(
    [TextLayerService],
    (service: TextLayerService) => {
      const html = service.render('alpha beta gamma', [
        TokenLocation.parse('1.1-1.2@1x2')!,
      ]);
      expect(html).toEqual(
        '<div><p id="y1">' +
          '<span id="f1.1-1.2@1x2_0" class="fr">alpha be</span>ta' +
          ' gamma</p></div>'
      );
    }
  ));

  it('render 1 line "al[pha be]ta gamma" should return div/p/span', inject(
    [TextLayerService],
    (service: TextLayerService) => {
      const html = service.render('alpha beta gamma', [
        TokenLocation.parse('1.1@3x3-1.2@1x2')!,
      ]);
      expect(html).toEqual(
        '<div><p id="y1">' +
          'al<span id="f1.1@3x3-1.2@1x2_0" class="fr">pha be</span>ta' +
          ' gamma</p></div>'
      );
    }
  ));

  /*
   * getSelectedLocationForEdit method
   * (see https://davidwalsh.name/convert-html-stings-dom-nodes)
   */
  it('getSelectedLocationForEdit from "[alpha] beta gamma" selected p should return 1.1', inject(
    [TextLayerService],
    (service: TextLayerService) => {
      const html = service.render('alpha beta gamma', [
        TokenLocation.parse('1.1')!,
      ]);
      const doc = document.createRange().createContextualFragment(html);

      const p = doc.childNodes.item(0);
      const range: SelectedRange = {
        commonAncestorContainer: p,
        startContainer: p.childNodes.item(0),
        startOffset: 0,
        endContainer: p.childNodes.item(2),
        endOffset: 5,
      };

      const loc = service.getSelectedLocationForEdit(range);

      expect(loc!.toString()).toEqual('1.1');
    }
  ));

  it('getSelectedLocationForEdit with commonAncestorContainer=span should return its location', () => {
    const service = new TextLayerService();
    const html = service.render('alpha beta gamma', [
      TokenLocation.parse('1.2')!,
    ]);
    const div = document.createElement('div');
    div.innerHTML = html;
    const span = div.querySelector('span')!;

    // select the span's single child node as a whole, so that
    // commonAncestorContainer is the span element itself
    const range = document.createRange();
    range.setStart(span, 0);
    range.setEnd(span, 1);

    const selRange: SelectedRange = {
      commonAncestorContainer: range.commonAncestorContainer,
      startContainer: range.startContainer,
      startOffset: range.startOffset,
      endContainer: range.endContainer,
      endOffset: range.endOffset,
    };

    const loc = service.getSelectedLocationForEdit(selRange);
    expect(loc!.toString()).toEqual('1.2');
  });

  it('getSelectedLocationForEdit with a text selection outside any span should return null', () => {
    const service = new TextLayerService();
    const html = service.render('alpha beta gamma');
    const div = document.createElement('div');
    div.innerHTML = html;
    const p = div.querySelector('p')!;
    const textNode = p.firstChild!;

    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 5);

    const selRange: SelectedRange = {
      commonAncestorContainer: range.commonAncestorContainer,
      startContainer: range.startContainer,
      startOffset: range.startOffset,
      endContainer: range.endContainer,
      endOffset: range.endOffset,
    };

    expect(service.getSelectedLocationForEdit(selRange)).toBeNull();
  });

  it('getSelectedLocationForEdit with a falsy range should return null', () => {
    const service = new TextLayerService();
    expect(
      service.getSelectedLocationForEdit(undefined as unknown as SelectedRange)
    ).toBeNull();
  });

  /*
   * getSelectedLocationForNew method
   */
  function selectedRangeFrom(
    startContainer: Node,
    startOffset: number,
    endContainer: Node,
    endOffset: number
  ): SelectedRange {
    const range = document.createRange();
    range.setStart(startContainer, startOffset);
    range.setEnd(endContainer, endOffset);
    return {
      commonAncestorContainer: range.commonAncestorContainer,
      startContainer: range.startContainer,
      startOffset: range.startOffset,
      endContainer: range.endContainer,
      endOffset: range.endOffset,
    };
  }

  it('getSelectedLocationForNew with a falsy range should return null', () => {
    const service = new TextLayerService();
    expect(
      service.getSelectedLocationForNew(
        undefined as unknown as SelectedRange,
        'alpha'
      )
    ).toBeNull();
  });

  it('getSelectedLocationForNew selecting a whole token "[beta]" should return 1.2', () => {
    const service = new TextLayerService();
    const text = 'alpha beta gamma';
    const html = service.render(text);
    const div = document.createElement('div');
    div.innerHTML = html;
    const textNode = div.querySelector('p')!.firstChild!;

    // "beta" spans indices 6..10 in "alpha beta gamma"
    const selRange = selectedRangeFrom(textNode, 6, textNode, 10);

    const loc = service.getSelectedLocationForNew(selRange, text);
    expect(loc!.toString()).toEqual('1.2');
  });

  it('getSelectedLocationForNew selecting a token portion "al[ph]a" should return 1.1@3x2', () => {
    const service = new TextLayerService();
    const text = 'alpha beta gamma';
    const html = service.render(text);
    const div = document.createElement('div');
    div.innerHTML = html;
    const textNode = div.querySelector('p')!.firstChild!;

    // "ph" spans indices 2..4 in "alpha beta gamma"
    const selRange = selectedRangeFrom(textNode, 2, textNode, 4);

    const loc = service.getSelectedLocationForNew(selRange, text);
    expect(loc!.toString()).toEqual('1.1@3x2');
  });

  it('getSelectedLocationForNew selecting multiple tokens "[beta gamma]" should return 1.2-1.3', () => {
    const service = new TextLayerService();
    const text = 'alpha beta gamma';
    const html = service.render(text);
    const div = document.createElement('div');
    div.innerHTML = html;
    const textNode = div.querySelector('p')!.firstChild!;

    // "beta gamma" spans indices 6..16 (end of text) in "alpha beta gamma"
    const selRange = selectedRangeFrom(textNode, 6, textNode, text.length);

    const loc = service.getSelectedLocationForNew(selRange, text);
    expect(loc!.toString()).toEqual('1.2-1.3');
  });

  it('getSelectedLocationForNew selecting across lines "[beta/gamma]" should return 1.2-2.1', () => {
    const service = new TextLayerService();
    const text = 'alpha beta\ngamma delta';
    const html = service.render(text);
    const div = document.createElement('div');
    div.innerHTML = html;
    const ps = div.querySelectorAll('p');
    const line1Text = ps[0].firstChild!;
    const line2Text = ps[1].firstChild!;

    // start at "beta" (offset 6 in "alpha beta"), end at end of "gamma"
    // (offset 5 in "gamma delta")
    const selRange = selectedRangeFrom(line1Text, 6, line2Text, 5);

    const loc = service.getSelectedLocationForNew(selRange, text);
    expect(loc!.toString()).toEqual('1.2-2.1');
  });

  it('getSelectedLocationForNew selecting across an existing fragment span should return null', () => {
    const service = new TextLayerService();
    const text = 'alpha beta gamma';
    // "beta" (1.2) is already an existing fragment, rendered as a span
    const html = service.render(text, [TokenLocation.parse('1.2')!]);
    const div = document.createElement('div');
    div.innerHTML = html;
    const p = div.querySelector('p')!;
    // children: text "alpha ", span "beta", text " gamma"
    const beforeSpanText = p.childNodes[0];
    const spanText = p.querySelector('span')!.firstChild!;

    // select from inside "alpha " into the existing "beta" span
    const selRange = selectedRangeFrom(beforeSpanText, 2, spanText, 2);

    expect(service.getSelectedLocationForNew(selRange, text)).toBeNull();
  });

  /*
   * getSelectedRange method
   */
  it('getSelectedRange with no active selection should return null', () => {
    const service = new TextLayerService();
    const sel = window.getSelection();
    sel?.removeAllRanges();
    expect(service.getSelectedRange()).toBeNull();
  });

  it('getSelectedRange with an active selection should return its range', () => {
    const service = new TextLayerService();
    const div = document.createElement('div');
    div.textContent = 'hello';
    document.body.appendChild(div);
    try {
      const range = document.createRange();
      range.setStart(div.firstChild!, 0);
      range.setEnd(div.firstChild!, 3);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);

      const result = service.getSelectedRange();
      expect(result).not.toBeNull();
      expect(result!.toString()).toEqual('hel');

      sel.removeAllRanges();
    } finally {
      document.body.removeChild(div);
    }
  });

  /*
   * getTextFragment method
   */
  it('getTextFragment from 1.1 in "[alpha] beta/gamma/delta epsilon"', () => {
    const text = 'alpha beta\r\ngamma\r\ndelta epsilon';
    const fr = new TextLayerService().getTextFragment(
      text,
      TokenLocation.parse('1.1')!
    );
    expect(fr).toBe('alpha');
  });

  it('getTextFragment from 1.2 in "alpha [beta]/gamma/delta epsilon"', () => {
    const text = 'alpha beta\r\ngamma\r\ndelta epsilon';
    const fr = new TextLayerService().getTextFragment(
      text,
      TokenLocation.parse('1.2')!
    );
    expect(fr).toBe('beta');
  });

  it('getTextFragment from 2.1 in "alpha beta/[gamma]/delta epsilon"', () => {
    const text = 'alpha beta\r\ngamma\r\ndelta epsilon';
    const fr = new TextLayerService().getTextFragment(
      text,
      TokenLocation.parse('2.1')!
    );
    expect(fr).toBe('gamma');
  });

  it('getTextFragment from 3.1 in "alpha beta/gamma/[delta] epsilon"', () => {
    const text = 'alpha beta\r\ngamma\r\ndelta epsilon';
    const fr = new TextLayerService().getTextFragment(
      text,
      TokenLocation.parse('3.1')!
    );
    expect(fr).toBe('delta');
  });

  it('getTextFragment from 3.2 in "alpha beta/gamma/delta [epsilon]"', () => {
    const text = 'alpha beta\r\ngamma\r\ndelta epsilon';
    const fr = new TextLayerService().getTextFragment(
      text,
      TokenLocation.parse('3.2')!
    );
    expect(fr).toBe('epsilon');
  });

  it('getTextFragment from 1.1@1x2 in "[al]pha beta/gamma/delta epsilon"', () => {
    const text = 'alpha beta\r\ngamma\r\ndelta epsilon';
    const fr = new TextLayerService().getTextFragment(
      text,
      TokenLocation.parse('1.1@1x2')!
    );
    expect(fr).toBe('al');
  });

  it('getTextFragment from 1.1@3x2 in "al[ph]a beta/gamma/delta epsilon"', () => {
    const text = 'alpha beta\r\ngamma\r\ndelta epsilon';
    const fr = new TextLayerService().getTextFragment(
      text,
      TokenLocation.parse('1.1@3x2')!
    );
    expect(fr).toBe('ph');
  });

  it('getTextFragment from 1.1@3x3 in "al[pha] beta/gamma/delta epsilon"', () => {
    const text = 'alpha beta\r\ngamma\r\ndelta epsilon';
    const fr = new TextLayerService().getTextFragment(
      text,
      TokenLocation.parse('1.1@3x3')!
    );
    expect(fr).toBe('pha');
  });

  it('getTextFragment from 1.1-1.2 in "[alpha beta]/gamma/delta epsilon"', () => {
    const text = 'alpha beta\r\ngamma\r\ndelta epsilon';
    const fr = new TextLayerService().getTextFragment(
      text,
      TokenLocation.parse('1.1-1.2')!
    );
    expect(fr).toBe('alpha beta');
  });

  it('getTextFragment from 1.2-2.1 in "alpha [beta/gamma]/delta epsilon"', () => {
    const text = 'alpha beta\r\ngamma\r\ndelta epsilon';
    const fr = new TextLayerService().getTextFragment(
      text,
      TokenLocation.parse('1.2-2.1')!
    );
    expect(fr).toBe('beta gamma');
  });

  it('getTextFragment from 1.2-3.2 in "alpha [beta/gamma/delta epsilon]"', () => {
    const text = 'alpha beta\r\ngamma\r\ndelta epsilon';
    const fr = new TextLayerService().getTextFragment(
      text,
      TokenLocation.parse('1.2-3.2')!
    );
    expect(fr).toBe('beta gamma delta epsilon');
  });

  it('getTextFragment from 1.1@3x3-1.2@1x2 in "al[pha be]ta/gamma/delta epsilon"', () => {
    const text = 'alpha beta\r\ngamma\r\ndelta epsilon';
    const fr = new TextLayerService().getTextFragment(
      text,
      TokenLocation.parse('1.1@3x3-1.2@1x2')!
    );
    expect(fr).toBe('pha be');
  });

  it('getTextFragment from 1.2@3x2-2.1@1x2 in "alpha be[ta/ga]mma/delta epsilon"', () => {
    const text = 'alpha beta\r\ngamma\r\ndelta epsilon';
    const fr = new TextLayerService().getTextFragment(
      text,
      TokenLocation.parse('1.2@3x2-2.1@1x2')!
    );
    expect(fr).toBe('ta ga');
  });

  it('getTextFragment from 3.1@4x2-3.2 in "alpha be[ta/ga]mma/del[ta epsilon]"', () => {
    const text = 'alpha beta\r\ngamma\r\ndelta epsilon';
    const fr = new TextLayerService().getTextFragment(
      text,
      TokenLocation.parse('3.1@4x2-3.2')!
    );
    expect(fr).toBe('ta epsilon');
  });
});
