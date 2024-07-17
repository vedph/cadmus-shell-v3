import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

// vendor
import { NgeMonacoModule } from '@cisstech/nge/monaco';
import { NgeMarkdownModule } from '@cisstech/nge/markdown';

// myrmidon
import { NgToolsModule } from '@myrmidon/ng-tools';
import { NgMatToolsModule } from '@myrmidon/ng-mat-tools';

// bricks
import {
  AssertedCompositeIdComponent,
  AssertedCompositeIdsComponent,
  AssertedIdsComponent,
} from '@myrmidon/cadmus-refs-asserted-ids';
import { DocReferencesComponent } from '@myrmidon/cadmus-refs-doc-references';
import {
  HistoricalDateComponent,
  HistoricalDatePipe,
} from '@myrmidon/cadmus-refs-historical-date';
import {
  AssertedChronotopeComponent,
  AssertedChronotopeSetComponent,
  AssertedChronotopesPipe,
} from '@myrmidon/cadmus-refs-asserted-chronotope';
import { AssertionComponent } from '@myrmidon/cadmus-refs-assertion';
import {
  CadmusProperNamePipe,
  ProperNameComponent,
} from '@myrmidon/cadmus-refs-proper-name';
import { CadmusTextEdService } from '@myrmidon/cadmus-text-ed';
import { PhysicalStateComponent } from '@myrmidon/cadmus-mat-physical-state';
import { PhysicalMeasurementSetComponent } from '@myrmidon/cadmus-mat-physical-size';

// cadmus
import { CadmusCoreModule } from '@myrmidon/cadmus-core';
import { CadmusUiModule } from '@myrmidon/cadmus-ui';

import { TokenTextPartComponent } from './token-text-part/token-text-part.component';
import { BibAuthorsEditorComponent } from './bib-authors-editor/bib-authors-editor.component';
import { BibliographyEntryComponent } from './bibliography-entry/bibliography-entry.component';
import { BibliographyPartComponent } from './bibliography-part/bibliography-part.component';
import { CategoriesPartComponent } from './categories-part/categories-part.component';
import { ChronologyFragmentComponent } from './chronology-fragment/chronology-fragment.component';
import { ChronotopesPartComponent } from './chronotopes-part/chronotopes-part.component';
import { CommentEditorComponent } from './comment-editor/comment-editor.component';
import { DocReferencesPartComponent } from './doc-references-part/doc-references-part.component';
import { ExternalIdsPartComponent } from './external-ids-part/external-ids-part.component';
import { HistoricalDatePartComponent } from './historical-date-part/historical-date-part.component';
import { HistoricalEventEditorComponent } from './historical-event-editor/historical-event-editor.component';
import { HistoricalEventsPartComponent } from './historical-events-part/historical-events-part.component';
import { IndexKeywordComponent } from './index-keyword/index-keyword.component';
import { IndexKeywordsPartComponent } from './index-keywords-part/index-keywords-part.component';
import { KeywordsPartComponent } from './keywords-part/keywords-part.component';
import { MetadataPartComponent } from './metadata-part/metadata-part.component';
import { NamesPartComponent } from './names-part/names-part.component';
import { NotePartComponent } from './note-part/note-part.component';
import { PinLinksPartComponent } from './pin-links-part/pin-links-part.component';
import { PinLinksFragmentComponent } from './pin-links-fragment/pin-links-fragment.component';
import { TextTileComponent } from './text-tile/text-tile.component';
import { TiledDataComponent } from './tiled-data/tiled-data.component';
import { TiledTextPartComponent } from './tiled-text-part/tiled-text-part.component';
import { RelatedEntityComponent } from './related-entity/related-entity.component';
import { PhysicalStatesPartComponent } from './physical-states-part/physical-states-part.component';
import { PhysicalMeasurementsPartComponent } from './physical-measurements-part/physical-measurements-part.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgeMonacoModule,
    NgeMarkdownModule,
    // material
    DragDropModule,
    MatBadgeModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    // cadmus
    NgToolsModule,
    NgMatToolsModule,
    CadmusCoreModule,
    CadmusUiModule,
    AssertedChronotopeSetComponent,
    AssertedChronotopesPipe,
    AssertedCompositeIdComponent,
    AssertedCompositeIdsComponent,
    AssertedIdsComponent,
    DocReferencesComponent,
    HistoricalDateComponent,
    HistoricalDatePipe,
    AssertionComponent,
    AssertedChronotopeComponent,
    ProperNameComponent,
    CadmusProperNamePipe,
    PhysicalStateComponent,
    PhysicalMeasurementSetComponent
  ],
  declarations: [
    BibAuthorsEditorComponent,
    BibliographyEntryComponent,
    BibliographyPartComponent,
    CategoriesPartComponent,
    ChronologyFragmentComponent,
    ChronotopesPartComponent,
    CommentEditorComponent,
    DocReferencesPartComponent,
    ExternalIdsPartComponent,
    HistoricalDatePartComponent,
    HistoricalEventEditorComponent,
    HistoricalEventsPartComponent,
    IndexKeywordComponent,
    IndexKeywordsPartComponent,
    KeywordsPartComponent,
    MetadataPartComponent,
    NamesPartComponent,
    NotePartComponent,
    PhysicalMeasurementsPartComponent,
    PhysicalStatesPartComponent,
    PinLinksFragmentComponent,
    PinLinksPartComponent,
    RelatedEntityComponent,
    TextTileComponent,
    TiledTextPartComponent,
    TiledDataComponent,
    TokenTextPartComponent,
  ],
  exports: [
    BibliographyPartComponent,
    CategoriesPartComponent,
    ChronologyFragmentComponent,
    CommentEditorComponent,
    ChronotopesPartComponent,
    DocReferencesPartComponent,
    ExternalIdsPartComponent,
    HistoricalDatePartComponent,
    HistoricalEventEditorComponent,
    HistoricalEventsPartComponent,
    IndexKeywordComponent,
    IndexKeywordsPartComponent,
    KeywordsPartComponent,
    MetadataPartComponent,
    NamesPartComponent,
    NotePartComponent,
    PhysicalMeasurementsPartComponent,
    PhysicalStatesPartComponent,
    PinLinksFragmentComponent,
    PinLinksPartComponent,
    RelatedEntityComponent,
    TiledDataComponent,
    TextTileComponent,
    TiledTextPartComponent,
    TokenTextPartComponent,
  ],
  providers: [CadmusTextEdService],
})
export class CadmusPartGeneralUiModule {}
