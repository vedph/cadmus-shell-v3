import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { TextTileComponent } from './text-tile.component';
import { TextTile, TEXT_TILE_TEXT_DATA_NAME } from '../tiled-text-part';

describe('TextTileComponent', () => {
  let component: TextTileComponent;
  let fixture: ComponentFixture<TextTileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, ReactiveFormsModule, TextTileComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TextTileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('resets text and form when tile is undefined', () => {
    fixture.componentRef.setInput('tile', undefined);
    fixture.detectChanges();
    expect(component.text()).toBeUndefined();
  });

  it('sets text from tile data when tile is set', () => {
    const tile: TextTile = { x: 1, data: { [TEXT_TILE_TEXT_DATA_NAME]: 'abc' } };
    fixture.componentRef.setInput('tile', tile);
    fixture.detectChanges();

    expect(component.text()).toBe('abc');
    expect(component.editedText.value).toBe('abc');
    expect(component.form.pristine).toBe(true);
  });

  it('sets text to undefined when tile has no data', () => {
    const tile: TextTile = { x: 1 };
    fixture.componentRef.setInput('tile', tile);
    fixture.detectChanges();

    expect(component.text()).toBeUndefined();
  });

  it('syncs the checker control from the checked model', () => {
    fixture.componentRef.setInput('checked', true);
    fixture.detectChanges();
    expect(component.checker.value).toBe(true);

    fixture.componentRef.setInput('checked', false);
    fixture.detectChanges();
    expect(component.checker.value).toBe(false);
  });

  it('propagates checker changes to checked when checkable is true and a tile is present', () => {
    const tile: TextTile = { x: 1 };
    fixture.componentRef.setInput('tile', tile);
    fixture.componentRef.setInput('checkable', true);
    fixture.detectChanges();

    component.checker.setValue(true);

    expect(component.checked()).toBe(true);
  });

  it('does not propagate checker changes to checked when checkable is false (bug fix)', () => {
    // Before the fix, `!this.checkable` (missing call parens on the input
    // signal) was always false, so this guard never actually blocked
    // updates. With the fix, checkable() is correctly read.
    const tile: TextTile = { x: 1 };
    fixture.componentRef.setInput('tile', tile);
    fixture.componentRef.setInput('checkable', false);
    fixture.componentRef.setInput('checked', false);
    fixture.detectChanges();

    component.checker.setValue(true);

    expect(component.checked()).toBe(false);
  });

  it('does not propagate checker changes to checked when there is no tile', () => {
    fixture.componentRef.setInput('tile', undefined);
    fixture.componentRef.setInput('checkable', true);
    fixture.detectChanges();

    component.checker.setValue(true);

    expect(component.checked()).toBe(false);
  });

  it('toggleCheckedNonEdit toggles checked when not editing and checkable (bug fix)', () => {
    // Before the fix, `!this.editing` (missing call parens) was always
    // false, so toggleCheckedNonEdit() never toggled anything.
    fixture.componentRef.setInput('checkable', true);
    fixture.componentRef.setInput('checked', false);
    fixture.detectChanges();

    component.toggleCheckedNonEdit();

    expect(component.checked()).toBe(true);
  });

  it('toggleCheckedNonEdit does nothing while editing', () => {
    fixture.componentRef.setInput('checkable', true);
    fixture.componentRef.setInput('checked', false);
    fixture.detectChanges();
    component.editing.set(true);

    component.toggleCheckedNonEdit();

    expect(component.checked()).toBe(false);
  });

  it('toggleCheckedNonEdit does nothing when not checkable', () => {
    fixture.componentRef.setInput('checkable', false);
    fixture.componentRef.setInput('checked', false);
    fixture.detectChanges();

    component.toggleCheckedNonEdit();

    expect(component.checked()).toBe(false);
  });

  it('edit() sets editing to true unless readonly', () => {
    const tile: TextTile = { x: 1 };
    fixture.componentRef.setInput('tile', tile);
    fixture.componentRef.setInput('readonly', false);
    fixture.detectChanges();

    component.edit();

    expect(component.editing()).toBe(true);
  });

  it('edit() does nothing when readonly', () => {
    const tile: TextTile = { x: 1 };
    fixture.componentRef.setInput('tile', tile);
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();

    component.edit();

    expect(component.editing()).toBe(false);
  });

  it('edit() does nothing when already editing', () => {
    const tile: TextTile = { x: 1 };
    fixture.componentRef.setInput('tile', tile);
    fixture.detectChanges();
    component.editing.set(true);

    component.edit();

    expect(component.editing()).toBe(true);
  });

  it('cancel() sets editing to false', () => {
    component.editing.set(true);
    component.cancel();
    expect(component.editing()).toBe(false);
  });

  it('requestEditData() emits editData with the current tile when not editing/readonly', () => {
    const tile: TextTile = { x: 1 };
    fixture.componentRef.setInput('tile', tile);
    fixture.componentRef.setInput('readonly', false);
    fixture.detectChanges();

    let emitted: TextTile | undefined;
    component.editData.subscribe((t) => (emitted = t));

    component.requestEditData();

    expect(emitted).toEqual(tile);
  });

  it('requestEditData() does not emit when editing', () => {
    const tile: TextTile = { x: 1 };
    fixture.componentRef.setInput('tile', tile);
    fixture.detectChanges();
    component.editing.set(true);

    let emitted = false;
    component.editData.subscribe(() => (emitted = true));
    component.requestEditData();

    expect(emitted).toBe(false);
  });

  it('requestEditData() does not emit when readonly', () => {
    const tile: TextTile = { x: 1 };
    fixture.componentRef.setInput('tile', tile);
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();

    let emitted = false;
    component.editData.subscribe(() => (emitted = true));
    component.requestEditData();

    expect(emitted).toBe(false);
  });

  it('requestDataEdit() emits editData when not readonly (bug fix)', () => {
    // Before the fix, `!this.readonly` (missing call parens) was always
    // false, so requestDataEdit() could never emit at all.
    const tile: TextTile = { x: 1 };
    fixture.componentRef.setInput('tile', tile);
    fixture.componentRef.setInput('readonly', false);
    fixture.detectChanges();

    let emitted: TextTile | undefined;
    component.editData.subscribe((t) => (emitted = t));

    component.requestDataEdit();

    expect(emitted).toEqual(tile);
  });

  it('requestDataEdit() does not emit when readonly', () => {
    const tile: TextTile = { x: 1 };
    fixture.componentRef.setInput('tile', tile);
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();

    let emitted = false;
    component.editData.subscribe(() => (emitted = true));
    component.requestDataEdit();

    expect(emitted).toBe(false);
  });

  it('save() does nothing when form is invalid', () => {
    const tile: TextTile = { x: 1, data: { [TEXT_TILE_TEXT_DATA_NAME]: 'abc' } };
    fixture.componentRef.setInput('tile', tile);
    fixture.detectChanges();
    component.editedText.setValue(null); // required -> invalid
    component.editing.set(true);

    component.save();

    expect(component.editing()).toBe(true);
  });

  it('save() does nothing when readonly', () => {
    const tile: TextTile = { x: 1, data: { [TEXT_TILE_TEXT_DATA_NAME]: 'abc' } };
    fixture.componentRef.setInput('tile', tile);
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    component.editedText.setValue('xyz');
    component.editing.set(true);

    component.save();

    expect(component.tile()!.data![TEXT_TILE_TEXT_DATA_NAME]).toBe('abc');
  });

  it('save() updates tile data with trimmed text and closes editing', () => {
    const tile: TextTile = { x: 1, data: { [TEXT_TILE_TEXT_DATA_NAME]: 'abc' } };
    fixture.componentRef.setInput('tile', tile);
    fixture.detectChanges();
    component.editedText.setValue('xyz');
    component.editing.set(true);

    component.save();

    expect(component.tile()!.data![TEXT_TILE_TEXT_DATA_NAME]).toBe('xyz');
    expect(component.editing()).toBe(false);
  });

  it('save() does nothing when there is no tile', () => {
    fixture.componentRef.setInput('tile', undefined);
    fixture.detectChanges();
    component.editedText.setValue('xyz');
    component.editing.set(true);

    component.save();

    // editing stays true since save() bailed out early (no tile)
    expect(component.editing()).toBe(true);
  });
});
