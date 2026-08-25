import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { DialogService } from '@myrmidon/ngx-mat-tools';

import { BibAuthorsEditorComponent } from './bib-authors-editor.component';
import { BibAuthor } from '../bibliography-part';

describe('BibAuthorsEditorComponent', () => {
  let component: BibAuthorsEditorComponent;
  let fixture: ComponentFixture<BibAuthorsEditorComponent>;
  let dialogService: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    dialogService = {
      confirm: vi.fn().mockReturnValue(of(true)),
    };

    await TestBed.configureTestingModule({
      imports: [BibAuthorsEditorComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: DialogService, useValue: dialogService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BibAuthorsEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('defaults authors to an empty array', () => {
    expect(component.authors()).toEqual([]);
  });

  it('addAuthor opens the editor with a blank author at index -1', () => {
    component.addAuthor();
    expect(component.editedAuthorIndex()).toBe(-1);
    expect(component.editedAuthor()).toEqual({ lastName: '' });
  });

  it('editAuthor clones the author (deep copy)', () => {
    const author: BibAuthor = { lastName: 'Doe' };
    component.editAuthor(author, 2);

    expect(component.editedAuthorIndex()).toBe(2);
    expect(component.editedAuthor()).toEqual(author);
    expect(component.editedAuthor()).not.toBe(author);

    // mutating original should not affect the cloned edited author
    author.lastName = 'Changed';
    expect(component.editedAuthor()?.lastName).toBe('Doe');
  });

  it('closeAuthor resets editing state', () => {
    component.editAuthor({ lastName: 'Doe' }, 0);
    component.closeAuthor();
    expect(component.editedAuthorIndex()).toBe(-1);
    expect(component.editedAuthor()).toBeUndefined();
  });

  it('saveAuthor appends a new author when index is -1', () => {
    component.addAuthor();
    const author: BibAuthor = { lastName: 'Doe' };

    component.saveAuthor(author);

    expect(component.authors()).toEqual([author]);
    expect(component.editedAuthorIndex()).toBe(-1);
    expect(component.editedAuthor()).toBeUndefined();
  });

  it('saveAuthor replaces the author at the edited index', () => {
    fixture.componentRef.setInput('authors', [
      { lastName: 'A' },
      { lastName: 'B' },
    ]);
    fixture.detectChanges();

    component.editAuthor(component.authors()[1], 1);
    component.saveAuthor({ lastName: 'B2' });

    expect(component.authors()).toEqual([
      { lastName: 'A' },
      { lastName: 'B2' },
    ]);
  });

  it('deleteAuthor removes the author when confirmed', () => {
    fixture.componentRef.setInput('authors', [
      { lastName: 'A' },
      { lastName: 'B' },
    ]);
    fixture.detectChanges();

    component.deleteAuthor(0);

    expect(dialogService.confirm).toHaveBeenCalled();
    expect(component.authors()).toEqual([{ lastName: 'B' }]);
  });

  it('deleteAuthor does not remove the author when not confirmed', () => {
    dialogService.confirm.mockReturnValue(of(false));
    fixture.componentRef.setInput('authors', [{ lastName: 'A' }]);
    fixture.detectChanges();

    component.deleteAuthor(0);

    expect(component.authors()).toEqual([{ lastName: 'A' }]);
  });

  it('deleteAuthor closes the editor when deleting the currently edited author', () => {
    fixture.componentRef.setInput('authors', [{ lastName: 'A' }]);
    fixture.detectChanges();
    component.editAuthor(component.authors()[0], 0);

    component.deleteAuthor(0);

    expect(component.editedAuthorIndex()).toBe(-1);
    expect(component.editedAuthor()).toBeUndefined();
  });

  it('moveAuthorUp does nothing for index 0', () => {
    fixture.componentRef.setInput('authors', [
      { lastName: 'A' },
      { lastName: 'B' },
    ]);
    fixture.detectChanges();

    component.moveAuthorUp(0);

    expect(component.authors()).toEqual([
      { lastName: 'A' },
      { lastName: 'B' },
    ]);
  });

  it('moveAuthorUp swaps with the previous author', () => {
    fixture.componentRef.setInput('authors', [
      { lastName: 'A' },
      { lastName: 'B' },
    ]);
    fixture.detectChanges();

    component.moveAuthorUp(1);

    expect(component.authors()).toEqual([
      { lastName: 'B' },
      { lastName: 'A' },
    ]);
  });

  it('moveAuthorDown does nothing for the last index', () => {
    fixture.componentRef.setInput('authors', [
      { lastName: 'A' },
      { lastName: 'B' },
    ]);
    fixture.detectChanges();

    component.moveAuthorDown(1);

    expect(component.authors()).toEqual([
      { lastName: 'A' },
      { lastName: 'B' },
    ]);
  });

  it('moveAuthorDown swaps with the next author', () => {
    fixture.componentRef.setInput('authors', [
      { lastName: 'A' },
      { lastName: 'B' },
    ]);
    fixture.detectChanges();

    component.moveAuthorDown(0);

    expect(component.authors()).toEqual([
      { lastName: 'B' },
      { lastName: 'A' },
    ]);
  });
});
