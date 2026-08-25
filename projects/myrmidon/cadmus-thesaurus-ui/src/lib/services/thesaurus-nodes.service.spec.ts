import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { ThesaurusNodesService } from './thesaurus-nodes.service';

function getFlatEntries(): ThesaurusEntry[] {
  return [
    {
      id: 'r',
      value: 'red',
    },
    {
      id: 'g',
      value: 'green',
    },
    {
      id: 'b',
      value: 'blue',
    },
  ];
}

function getTreeEntries(): ThesaurusEntry[] {
  return [
    {
      id: 'size',
      value: 'size',
    },
    {
      id: 'size.s',
      value: 'small',
    },
    {
      id: 'size.m',
      value: 'mid',
    },
    {
      id: 'size.l',
      value: 'large',
    },
    {
      id: 'color',
      value: 'color',
    },
    {
      id: 'color.r',
      value: 'red',
    },
    {
      id: 'color.g',
      value: 'green',
    },
    {
      id: 'color.b',
      value: 'blue',
    },
  ];
}

describe('ThesaurusNodesService', () => {
  let service: ThesaurusNodesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThesaurusNodesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // #region flat set
  it('should import flat set', () => {
    service.importEntries(getFlatEntries());
    expect(service.length).toBe(3);
    const nodes = service.getNodes();
    // r
    let node = nodes[0];
    expect(node.id).toBe('r');
    expect(node.parentId).toBeFalsy();
    expect(node.hasChildren).toBeFalsy();
    expect(node.ordinal).toBe(1);
    expect(node.lastSibling).toBeFalsy();
    // g
    node = nodes[1];
    expect(node.id).toBe('g');
    expect(node.parentId).toBeFalsy();
    expect(node.hasChildren).toBeFalsy();
    expect(node.ordinal).toBe(2);
    expect(node.lastSibling).toBeFalsy();
    // b
    node = nodes[2];
    expect(node.id).toBe('b');
    expect(node.parentId).toBeFalsy();
    expect(node.hasChildren).toBeFalsy();
    expect(node.ordinal).toBe(3);
    expect(node.lastSibling).toBe(true);
  });

  it('should have getParentIds empty for flat set', () => {
    service.importEntries(getFlatEntries());
    expect(service.getParentIds().length).toBe(0);
  });

  it('should not move 1st entry up in flat set', () => {
    service.importEntries(getFlatEntries());
    service.moveUp('r');
    const nodes = service.getNodes();
    expect(nodes[0].id).toBe('r');
    expect(nodes[1].id).toBe('g');
    expect(nodes[2].id).toBe('b');
  });

  it('should not move last entry down in flat set', () => {
    service.importEntries(getFlatEntries());
    service.moveDown('b');
    const nodes = service.getNodes();
    expect(nodes[0].id).toBe('r');
    expect(nodes[1].id).toBe('g');
    expect(nodes[2].id).toBe('b');
  });

  it('should move 2nd entry up in flat set', () => {
    service.importEntries(getFlatEntries());
    service.moveUp('g');
    const nodes = service.getNodes();
    expect(nodes[0].id).toBe('g');
    expect(nodes[0].ordinal).toBe(1);
    expect(nodes[1].id).toBe('r');
    expect(nodes[1].ordinal).toBe(2);
    expect(nodes[2].id).toBe('b');
    expect(nodes[2].ordinal).toBe(3);
    expect(nodes[2].lastSibling).toBe(true);
  });

  it('should move 2nd entry down in flat set', () => {
    service.importEntries(getFlatEntries());
    service.moveDown('g');
    const nodes = service.getNodes();
    expect(nodes[0].id).toBe('r');
    expect(nodes[0].ordinal).toBe(1);
    expect(nodes[1].id).toBe('b');
    expect(nodes[1].ordinal).toBe(2);
    expect(nodes[2].id).toBe('g');
    expect(nodes[2].ordinal).toBe(3);
    expect(nodes[2].lastSibling).toBe(true);
  });

  it('should delete 1st entry in flat set', () => {
    service.importEntries(getFlatEntries());
    service.delete('r');
    const nodes = service.getNodes();
    expect(nodes.length).toBe(2);
    expect(nodes[0].id).toBe('g');
    expect(nodes[0].ordinal).toBe(1);
    expect(nodes[1].id).toBe('b');
    expect(nodes[1].ordinal).toBe(2);
    expect(nodes[1].lastSibling).toBe(true);
  });

  it('should delete 2nd entry in flat set', () => {
    service.importEntries(getFlatEntries());
    service.delete('g');
    const nodes = service.getNodes();
    expect(nodes.length).toBe(2);
    expect(nodes[0].id).toBe('r');
    expect(nodes[0].ordinal).toBe(1);
    expect(nodes[1].id).toBe('b');
    expect(nodes[1].ordinal).toBe(2);
    expect(nodes[1].lastSibling).toBe(true);
  });

  it('should delete last entry in flat set', () => {
    service.importEntries(getFlatEntries());
    service.delete('b');
    const nodes = service.getNodes();
    expect(nodes.length).toBe(2);
    expect(nodes[0].id).toBe('r');
    expect(nodes[0].ordinal).toBe(1);
    expect(nodes[1].id).toBe('g');
    expect(nodes[1].ordinal).toBe(2);
    expect(nodes[1].lastSibling).toBe(true);
  });

  it('should replace 1st entry in flat set', () => {
    service.importEntries(getFlatEntries());
    service.add({
      id: 'r',
      value: 'RED',
      ordinal: 1,
      level: 1,
    });
    const nodes = service.getNodes();
    expect(nodes.length).toBe(3);
    expect(nodes[0].id).toBe('r');
    expect(nodes[0].value).toBe('RED');
    expect(nodes[0].ordinal).toBe(1);
    expect(nodes[1].id).toBe('g');
    expect(nodes[1].ordinal).toBe(2);
    expect(nodes[2].id).toBe('b');
    expect(nodes[2].ordinal).toBe(3);
    expect(nodes[2].lastSibling).toBe(true);
  });

  it('should replace mid entry in flat set', () => {
    service.importEntries(getFlatEntries());
    service.add({
      id: 'g',
      value: 'GREEN',
      ordinal: 2,
      level: 1,
    });
    const nodes = service.getNodes();
    expect(nodes.length).toBe(3);
    expect(nodes[0].id).toBe('r');
    expect(nodes[0].ordinal).toBe(1);
    expect(nodes[1].id).toBe('g');
    expect(nodes[1].value).toBe('GREEN');
    expect(nodes[1].ordinal).toBe(2);
    expect(nodes[2].id).toBe('b');
    expect(nodes[2].ordinal).toBe(3);
    expect(nodes[2].lastSibling).toBe(true);
  });

  it('should replace last entry in flat set', () => {
    service.importEntries(getFlatEntries());
    service.add({
      id: 'b',
      value: 'BLUE',
      ordinal: 3,
      level: 1,
    });
    const nodes = service.getNodes();
    expect(nodes.length).toBe(3);
    expect(nodes[0].id).toBe('r');
    expect(nodes[0].ordinal).toBe(1);
    expect(nodes[1].id).toBe('g');
    expect(nodes[1].ordinal).toBe(2);
    expect(nodes[2].id).toBe('b');
    expect(nodes[2].value).toBe('BLUE');
    expect(nodes[2].ordinal).toBe(3);
    expect(nodes[2].lastSibling).toBe(true);
  });

  it('should add as 1st entry in flat set', () => {
    service.importEntries(getFlatEntries());
    service.add({
      id: 'w',
      value: 'white',
      ordinal: 1,
      level: 1,
    });
    const nodes = service.getNodes();
    expect(nodes.length).toBe(4);
    expect(nodes[0].id).toBe('w');
    expect(nodes[0].ordinal).toBe(1);
    expect(nodes[1].id).toBe('r');
    expect(nodes[1].ordinal).toBe(2);
    expect(nodes[2].id).toBe('g');
    expect(nodes[2].ordinal).toBe(3);
    expect(nodes[3].id).toBe('b');
    expect(nodes[3].ordinal).toBe(4);
    expect(nodes[3].lastSibling).toBe(true);
  });

  it('should add as 2nd entry in flat set', () => {
    service.importEntries(getFlatEntries());
    service.add({
      id: 'w',
      value: 'white',
      ordinal: 2,
      level: 1,
    });
    const nodes = service.getNodes();
    expect(nodes.length).toBe(4);
    expect(nodes[0].id).toBe('r');
    expect(nodes[0].ordinal).toBe(1);
    expect(nodes[1].id).toBe('w');
    expect(nodes[1].ordinal).toBe(2);
    expect(nodes[2].id).toBe('g');
    expect(nodes[2].ordinal).toBe(3);
    expect(nodes[3].id).toBe('b');
    expect(nodes[3].ordinal).toBe(4);
    expect(nodes[3].lastSibling).toBe(true);
  });

  it('should add as penultimate entry in flat set', () => {
    service.importEntries(getFlatEntries());
    service.add({
      id: 'w',
      value: 'white',
      ordinal: 3,
      level: 1,
    });
    const nodes = service.getNodes();
    expect(nodes.length).toBe(4);
    expect(nodes[0].id).toBe('r');
    expect(nodes[0].ordinal).toBe(1);
    expect(nodes[1].id).toBe('g');
    expect(nodes[1].ordinal).toBe(2);
    expect(nodes[2].id).toBe('w');
    expect(nodes[2].ordinal).toBe(3);
    expect(nodes[3].id).toBe('b');
    expect(nodes[3].ordinal).toBe(4);
    expect(nodes[3].lastSibling).toBe(true);
  });

  it('should add as last entry in flat set', () => {
    service.importEntries(getFlatEntries());
    service.add({
      id: 'w',
      value: 'white',
      ordinal: 4,
      level: 1,
    });
    const nodes = service.getNodes();
    expect(nodes.length).toBe(4);
    expect(nodes[0].id).toBe('r');
    expect(nodes[0].ordinal).toBe(1);
    expect(nodes[1].id).toBe('g');
    expect(nodes[1].ordinal).toBe(2);
    expect(nodes[2].id).toBe('b');
    expect(nodes[2].ordinal).toBe(3);
    expect(nodes[3].id).toBe('w');
    expect(nodes[3].ordinal).toBe(4);
    expect(nodes[3].lastSibling).toBe(true);
  });
  //#endregion

  // #region tree set
  it('should import tree set', () => {
    service.importEntries(getTreeEntries());
    const nodes = service.getNodes();
    expect(nodes.length).toBe(8);
    // size
    let node = nodes[0];
    expect(node.id).toBe('size');
    expect(node.parentId).toBeFalsy();
    expect(node.hasChildren).toBe(true);
    expect(node.ordinal).toBe(1);
    expect(node.lastSibling).toBeFalsy();
    // size.s
    node = nodes[1];
    expect(node.id).toBe('size.s');
    expect(node.parentId).toBe('size');
    expect(node.hasChildren).toBeFalsy();
    expect(node.ordinal).toBe(1);
    expect(node.lastSibling).toBeFalsy();
    // size.m
    node = nodes[2];
    expect(node.id).toBe('size.m');
    expect(node.parentId).toBe('size');
    expect(node.hasChildren).toBeFalsy();
    expect(node.ordinal).toBe(2);
    expect(node.lastSibling).toBeFalsy();
    // size.l
    node = nodes[3];
    expect(node.id).toBe('size.l');
    expect(node.parentId).toBe('size');
    expect(node.hasChildren).toBeFalsy();
    expect(node.ordinal).toBe(3);
    expect(node.lastSibling).toBe(true);
    // color
    node = nodes[4];
    expect(node.id).toBe('color');
    expect(node.parentId).toBeFalsy();
    expect(node.hasChildren).toBe(true);
    expect(node.ordinal).toBe(2);
    expect(node.lastSibling).toBe(true);
    // color.r
    node = nodes[5];
    expect(node.id).toBe('color.r');
    expect(node.parentId).toBe('color');
    expect(node.hasChildren).toBeFalsy();
    expect(node.ordinal).toBe(1);
    expect(node.lastSibling).toBeFalsy();
    // color.g
    node = nodes[6];
    expect(node.id).toBe('color.g');
    expect(node.parentId).toBe('color');
    expect(node.hasChildren).toBeFalsy();
    expect(node.ordinal).toBe(2);
    expect(node.lastSibling).toBeFalsy();
    // color.b
    node = nodes[7];
    expect(node.id).toBe('color.b');
    expect(node.parentId).toBe('color');
    expect(node.hasChildren).toBeFalsy();
    expect(node.ordinal).toBe(3);
    expect(node.lastSibling).toBe(true);
  });

  it('should have getParentIds for tree set', () => {
    service.importEntries(getTreeEntries());
    const entries = service.getParentIds();
    expect(entries.length).toBe(2);
    expect(entries[0].id).toBe('size');
    expect(entries[1].id).toBe('color');
  });

  it('should not move 1st entry up in tree set', () => {
    service.importEntries(getTreeEntries());
    service.moveUp('color.r');
    const nodes = service.getNodes();
    expect(nodes[5].id).toBe('color.r');
    expect(nodes[6].id).toBe('color.g');
    expect(nodes[7].id).toBe('color.b');
    expect(nodes[7].lastSibling).toBe(true);
  });

  it('should not move last entry down in tree set', () => {
    service.importEntries(getTreeEntries());
    service.moveDown('size.l');
    const nodes = service.getNodes();
    expect(nodes[1].id).toBe('size.s');
    expect(nodes[2].id).toBe('size.m');
    expect(nodes[3].id).toBe('size.l');
    expect(nodes[3].lastSibling).toBe(true);
  });

  it('should move 2nd entry up in tree set', () => {
    service.importEntries(getTreeEntries());
    service.moveUp('color.g');
    const nodes = service.getNodes();
    expect(nodes[5].id).toBe('color.g');
    expect(nodes[5].ordinal).toBe(1);
    expect(nodes[6].id).toBe('color.r');
    expect(nodes[6].ordinal).toBe(2);
    expect(nodes[7].id).toBe('color.b');
    expect(nodes[7].ordinal).toBe(3);
    expect(nodes[7].lastSibling).toBe(true);
  });

  it('should move 2nd entry down in tree set', () => {
    service.importEntries(getTreeEntries());
    service.moveDown('color.g');
    const nodes = service.getNodes();
    expect(nodes[5].id).toBe('color.r');
    expect(nodes[5].ordinal).toBe(1);
    expect(nodes[6].id).toBe('color.b');
    expect(nodes[6].ordinal).toBe(2);
    expect(nodes[7].id).toBe('color.g');
    expect(nodes[7].ordinal).toBe(3);
    expect(nodes[7].lastSibling).toBe(true);
  });

  it('should delete 1st entry in tree set', () => {
    service.importEntries(getTreeEntries());
    service.delete('color.r');
    const nodes = service.getNodes();
    expect(nodes.length).toBe(7);
    expect(nodes[5].id).toBe('color.g');
    expect(nodes[5].ordinal).toBe(1);
    expect(nodes[6].id).toBe('color.b');
    expect(nodes[6].ordinal).toBe(2);
    expect(nodes[6].lastSibling).toBe(true);
  });

  it('should delete 2nd entry in tree set', () => {
    service.importEntries(getTreeEntries());
    service.delete('color.g');
    const nodes = service.getNodes();
    expect(nodes.length).toBe(7);
    expect(nodes[5].id).toBe('color.r');
    expect(nodes[5].ordinal).toBe(1);
    expect(nodes[6].id).toBe('color.b');
    expect(nodes[6].ordinal).toBe(2);
    expect(nodes[6].lastSibling).toBe(true);
  });

  it('should delete last entry in tree set', () => {
    service.importEntries(getTreeEntries());
    service.delete('color.b');
    const nodes = service.getNodes();
    expect(nodes.length).toBe(7);
    expect(nodes[5].id).toBe('color.r');
    expect(nodes[5].ordinal).toBe(1);
    expect(nodes[6].id).toBe('color.g');
    expect(nodes[6].ordinal).toBe(2);
    expect(nodes[6].lastSibling).toBe(true);
  });

  it('should replace 1st entry in tree set', () => {
    service.importEntries(getTreeEntries());
    service.add({
      id: 'color.r',
      value: 'RED',
      ordinal: 1,
      level: 2,
    });
    const nodes = service.getNodes();
    expect(nodes.length).toBe(8);
    expect(nodes[5].id).toBe('color.r');
    expect(nodes[5].value).toBe('RED');
    expect(nodes[5].ordinal).toBe(1);
    expect(nodes[6].id).toBe('color.g');
    expect(nodes[6].ordinal).toBe(2);
    expect(nodes[7].id).toBe('color.b');
    expect(nodes[7].ordinal).toBe(3);
    expect(nodes[7].lastSibling).toBe(true);
  });

  it('should replace mid entry in tree set', () => {
    service.importEntries(getTreeEntries());
    service.add({
      id: 'color.g',
      value: 'GREEN',
      ordinal: 2,
      level: 2,
    });
    const nodes = service.getNodes();
    expect(nodes.length).toBe(8);
    expect(nodes[5].id).toBe('color.r');
    expect(nodes[5].ordinal).toBe(1);
    expect(nodes[6].id).toBe('color.g');
    expect(nodes[6].value).toBe('GREEN');
    expect(nodes[6].ordinal).toBe(2);
    expect(nodes[7].id).toBe('color.b');
    expect(nodes[7].ordinal).toBe(3);
    expect(nodes[7].lastSibling).toBe(true);
  });

  it('should replace last entry in tree set', () => {
    service.importEntries(getTreeEntries());
    service.add({
      id: 'color.b',
      value: 'BLUE',
      ordinal: 3,
      level: 2,
    });
    const nodes = service.getNodes();
    expect(nodes.length).toBe(8);
    expect(nodes[5].id).toBe('color.r');
    expect(nodes[5].ordinal).toBe(1);
    expect(nodes[6].id).toBe('color.g');
    expect(nodes[6].ordinal).toBe(2);
    expect(nodes[7].id).toBe('color.b');
    expect(nodes[7].value).toBe('BLUE');
    expect(nodes[7].ordinal).toBe(3);
    expect(nodes[7].lastSibling).toBe(true);
  });

  it('should add as 1st child entry in tree set', () => {
    service.importEntries(getTreeEntries());
    service.add({
      id: 'color.w',
      parentId: 'color',
      value: 'white',
      ordinal: 1,
      level: 2,
    });
    const nodes = service.getNodes();
    expect(nodes.length).toBe(9);
    expect(nodes[5].id).toBe('color.w');
    expect(nodes[5].ordinal).toBe(1);
    expect(nodes[6].id).toBe('color.r');
    expect(nodes[6].ordinal).toBe(2);
    expect(nodes[7].id).toBe('color.g');
    expect(nodes[7].ordinal).toBe(3);
    expect(nodes[8].id).toBe('color.b');
    expect(nodes[8].ordinal).toBe(4);
    expect(nodes[8].lastSibling).toBe(true);
  });

  it('should add as 2nd child entry in tree set', () => {
    service.importEntries(getTreeEntries());
    service.add({
      id: 'color.w',
      parentId: 'color',
      value: 'white',
      ordinal: 2,
      level: 2,
    });
    const nodes = service.getNodes();
    expect(nodes.length).toBe(9);
    expect(nodes[5].id).toBe('color.r');
    expect(nodes[5].ordinal).toBe(1);
    expect(nodes[6].id).toBe('color.w');
    expect(nodes[6].ordinal).toBe(2);
    expect(nodes[7].id).toBe('color.g');
    expect(nodes[7].ordinal).toBe(3);
    expect(nodes[8].id).toBe('color.b');
    expect(nodes[8].ordinal).toBe(4);
    expect(nodes[8].lastSibling).toBe(true);
  });

  it('should add as penultimate child entry in tree set', () => {
    service.importEntries(getTreeEntries());
    service.add({
      id: 'color.w',
      parentId: 'color',
      value: 'white',
      ordinal: 3,
      level: 2,
    });
    const nodes = service.getNodes();
    expect(nodes.length).toBe(9);
    expect(nodes[5].id).toBe('color.r');
    expect(nodes[5].ordinal).toBe(1);
    expect(nodes[6].id).toBe('color.g');
    expect(nodes[6].ordinal).toBe(2);
    expect(nodes[7].id).toBe('color.w');
    expect(nodes[7].ordinal).toBe(3);
    expect(nodes[7].lastSibling).toBeFalsy();
    expect(nodes[8].id).toBe('color.b');
    expect(nodes[8].ordinal).toBe(4);
    expect(nodes[8].lastSibling).toBe(true);
  });

  it('should add as last child entry in tree set', () => {
    service.importEntries(getTreeEntries());
    service.add({
      id: 'color.w',
      parentId: 'color',
      value: 'white',
      ordinal: 4,
      level: 2,
    });
    const nodes = service.getNodes();
    expect(nodes.length).toBe(9);
    expect(nodes[5].id).toBe('color.r');
    expect(nodes[5].ordinal).toBe(1);
    expect(nodes[6].id).toBe('color.g');
    expect(nodes[6].ordinal).toBe(2);
    expect(nodes[7].id).toBe('color.b');
    expect(nodes[7].ordinal).toBe(3);
    expect(nodes[7].lastSibling).toBeFalsy();
    expect(nodes[8].id).toBe('color.w');
    expect(nodes[8].ordinal).toBe(4);
    expect(nodes[8].lastSibling).toBe(true);
  });

  it('should add as 1st top sibling in tree set', () => {
    service.importEntries(getTreeEntries());
    service.add({
      id: 'shape',
      value: 'shape',
      ordinal: 1,
      level: 1,
    });
    const nodes = service.getNodes();
    expect(nodes.length).toBe(9);
    expect(nodes[0].id).toBe('shape');
    expect(nodes[0].ordinal).toBe(1);
    expect(nodes[1].id).toBe('size');
    expect(nodes[1].ordinal).toBe(2);
    expect(nodes[5].id).toBe('color');
    expect(nodes[5].ordinal).toBe(3);
  });

  it('should add as 2nd top sibling in tree set', () => {
    service.importEntries(getTreeEntries());
    service.add({
      id: 'shape',
      value: 'shape',
      ordinal: 2,
      level: 1,
    });
    const nodes = service.getNodes();
    expect(nodes.length).toBe(9);
    expect(nodes[0].id).toBe('size');
    expect(nodes[0].ordinal).toBe(1);
    expect(nodes[4].id).toBe('shape');
    expect(nodes[4].ordinal).toBe(2);
    expect(nodes[5].id).toBe('color');
    expect(nodes[5].ordinal).toBe(3);
  });
  //#endregion

  // #region 3-level tree
  it('should assign levels 1/2/3 down a 3-level chain', () => {
    service.importEntries([
      { id: 'a', value: 'A' },
      { id: 'a.b', value: 'AB' },
      { id: 'a.b.c', value: 'ABC' },
    ]);
    const nodes = service.getNodes();
    expect(nodes[0].level).toBe(1);
    expect(nodes[1].level).toBe(2);
    expect(nodes[2].level).toBe(3);
    expect(nodes[1].parentId).toBe('a');
    expect(nodes[2].parentId).toBe('a.b');
  });
  //#endregion

  // #region add empty-id placeholder replacement
  it('should remove a previously added empty-id placeholder when a real node is added', () => {
    service.importEntries([]);
    service.add({ id: '', value: '', ordinal: 0, level: 1 });
    expect(service.length).toBe(1);
    expect(service.getNodes()[0].id).toBe('');

    service.add({ id: 'new1', value: 'New', ordinal: 1, level: 1 });

    expect(service.length).toBe(1);
    expect(service.getNodes()[0].id).toBe('new1');
  });
  //#endregion

  // #region delete edge cases
  it('should do nothing when deleting a non-existent ID', () => {
    service.importEntries(getFlatEntries());
    service.delete('does-not-exist');
    expect(service.length).toBe(3);
  });
  //#endregion

  // #region getPage
  describe('getPage', () => {
    it('should return all nodes with no filter', async () => {
      service.importEntries(getTreeEntries());
      const page = await firstValueFrom(service.getPage({}));
      expect(page.total).toBe(8);
      expect(page.items.length).toBe(8);
    });

    it('should filter by idOrValue against both id and value, case-insensitively', async () => {
      service.importEntries(getTreeEntries());
      const page = await firstValueFrom(service.getPage({ idOrValue: 'RED' }));
      expect(page.total).toBe(1);
      expect(page.items[0].id).toBe('color.r');
    });

    it('should filter by parentId', async () => {
      service.importEntries(getTreeEntries());
      const page = await firstValueFrom(
        service.getPage({ parentId: 'color' })
      );
      expect(page.total).toBe(3);
      expect(page.items.map((n) => n.id)).toEqual([
        'color.r',
        'color.g',
        'color.b',
      ]);
    });

    it('should exclude (from both items and total) the children of a collapsed node', async () => {
      service.importEntries(getTreeEntries());
      const sizeNode = service.getNodes()[0];
      service.add({ ...sizeNode, collapsed: true });

      const page = await firstValueFrom(service.getPage({}));

      expect(page.total).toBe(5);
      expect(page.items.map((n) => n.id)).toEqual([
        'size',
        'color',
        'color.r',
        'color.g',
        'color.b',
      ]);
    });

    it('should paginate using pageNumber/pageSize while total still counts all matches', async () => {
      service.importEntries(getTreeEntries());
      const page = await firstValueFrom(service.getPage({}, 2, 2));
      expect(page.total).toBe(8);
      expect(page.pageCount).toBe(4);
      expect(page.items.map((n) => n.id)).toEqual(['size.m', 'size.l']);
    });
  });
  //#endregion

  // #region toggleAll
  describe('toggleAll', () => {
    it('should set the collapsed state on every node', () => {
      service.importEntries(getTreeEntries());
      service.toggleAll(true);
      expect(service.getNodes().every((n) => n.collapsed === true)).toBe(
        true
      );

      service.toggleAll(false);
      expect(service.getNodes().every((n) => n.collapsed === false)).toBe(
        true
      );
    });
  });
  //#endregion
});
