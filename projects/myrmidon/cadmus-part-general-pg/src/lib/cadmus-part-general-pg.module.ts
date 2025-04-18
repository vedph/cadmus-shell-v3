import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatToolbarModule } from '@angular/material/toolbar';

import { PendingChangesGuard } from '@myrmidon/cadmus-core';
import {
  ASSERTED_HISTORICAL_DATES_PART_TYPEID,
  BIBLIOGRAPHY_PART_TYPEID,
  CATEGORIES_PART_TYPEID,
  CHRONOTOPES_PART_TYPEID,
  COMMENT_PART_TYPEID,
  DISTRICT_LOCATION_PART_TYPEID,
  DOC_REFERENCES_PART_TYPEID,
  EXTERNAL_IDS_PART_TYPEID,
  HISTORICAL_DATE_PART_TYPEID,
  HISTORICAL_EVENTS_PART_TYPEID,
  INDEX_KEYWORDS_PART_TYPEID,
  KEYWORDS_PART_TYPEID,
  METADATA_PART_TYPEID,
  NAMES_PART_TYPEID,
  NOTE_PART_TYPEID,
  PIN_LINKS_PART_TYPEID,
  TILED_TEXT_PART_TYPEID,
  TOKEN_TEXT_PART_TYPEID,
  PHYSICAL_STATES_PART_TYPEID,
  CHRONOLOGY_FRAGMENT_TYPEID,
  COMMENT_FRAGMENT_TYPEID,
  PIN_LINKS_FRAGMENT_TYPEID,
  PHYSICAL_MEASUREMENTS_PART_TYPEID,
  DECORATED_COUNTS_PART_TYPEID,
} from '@myrmidon/cadmus-part-general-ui';

import { BibliographyPartFeatureComponent } from './bibliography-part-feature/bibliography-part-feature.component';
import { CategoriesPartFeatureComponent } from './categories-part-feature/categories-part-feature.component';
import { ChronologyFragmentFeatureComponent } from './chronology-fragment-feature/chronology-fragment-feature.component';
import { ChronotopesPartFeatureComponent } from './chronotopes-part-feature/chronotopes-part-feature.component';
import { CommentFragmentFeatureComponent } from './comment-fragment-feature/comment-fragment-feature.component';
import { CommentPartFeatureComponent } from './comment-part-feature/comment-part-feature.component';
import { DecoratedCountsPartFeatureComponent } from './decorated-counts-part-feature/decorated-counts-part-feature.component';
import { DistrictLocationPartFeatureComponent } from './district-location-part-feature/district-location-part-feature.component';
import { DocReferencesPartFeatureComponent } from './doc-references-part-feature/doc-references-part-feature.component';
import { ExternalIdsPartFeatureComponent } from './external-ids-part-feature/external-ids-part-feature.component';
import { HistoricalDatePartFeatureComponent } from './historical-date-part-feature/historical-date-part-feature.component';
import { HistoricalEventsPartFeatureComponent } from './historical-events-part-feature/historical-events-part-feature.component';
import { IndexKeywordsPartFeatureComponent } from './index-keywords-part-feature/index-keywords-part-feature.component';
import { KeywordsPartFeatureComponent } from './keywords-part-feature/keywords-part-feature.component';
import { MetadataPartFeatureComponent } from './metadata-part-feature/metadata-part-feature.component';
import { NamesPartFeatureComponent } from './names-part-feature/names-part-feature.component';
import { NotePartFeatureComponent } from './note-part-feature/note-part-feature.component';
import { PinLinksPartFeatureComponent } from './pin-links-part-feature/pin-links-part-feature.component';
import { PinLinksFragmentFeatureComponent } from './pin-links-fragment-feature/pin-links-fragment-feature.component';
import { PhysicalStatesPartFeatureComponent } from './physical-states-part-feature/physical-states-part-feature.component';
import { PhysicalMeasurementsPartFeatureComponent } from './physical-measurements-part-feature/physical-measurements-part-feature.component';
import { TiledTextPartFeatureComponent } from './tiled-text-part-feature/tiled-text-part-feature.component';
import { TiledTextLayerPartFeatureComponent } from './tiled-text-layer-part-feature/tiled-text-layer-part-feature.component';
import { TokenTextLayerPartFeatureComponent } from './token-text-layer-part-feature/token-text-layer-part-feature.component';
import { TokenTextPartFeatureComponent } from './token-text-part-feature/token-text-part-feature.component';
import { AssertedHistoricalDateFeatureComponent } from './asserted-historical-date-feature/asserted-historical-date-feature.component';

// https://github.com/ng-packagr/ng-packagr/issues/778
export const RouterModuleForChild = RouterModule.forChild([
  {
    path: `${ASSERTED_HISTORICAL_DATES_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: AssertedHistoricalDateFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `${BIBLIOGRAPHY_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: BibliographyPartFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `${CATEGORIES_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: CategoriesPartFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `${COMMENT_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: CommentPartFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `${CHRONOTOPES_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: ChronotopesPartFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `${DECORATED_COUNTS_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: DecoratedCountsPartFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `${DISTRICT_LOCATION_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: DistrictLocationPartFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `${DOC_REFERENCES_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: DocReferencesPartFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `${EXTERNAL_IDS_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: ExternalIdsPartFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `${HISTORICAL_DATE_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: HistoricalDatePartFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `${HISTORICAL_EVENTS_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: HistoricalEventsPartFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `${KEYWORDS_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: KeywordsPartFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `${INDEX_KEYWORDS_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: IndexKeywordsPartFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `${METADATA_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: MetadataPartFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `${NAMES_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: NamesPartFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `${NOTE_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: NotePartFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `${PHYSICAL_MEASUREMENTS_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: PhysicalMeasurementsPartFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `${PHYSICAL_STATES_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: PhysicalStatesPartFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `${PIN_LINKS_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: PinLinksPartFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `${TOKEN_TEXT_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: TokenTextPartFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `${TILED_TEXT_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: TiledTextPartFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: 'it.vedph.token-text-layer/:pid',
    pathMatch: 'full',
    component: TokenTextLayerPartFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: 'it.vedph.tiled-text-layer/:pid',
    pathMatch: 'full',
    component: TiledTextLayerPartFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `fragment/:pid/${COMMENT_FRAGMENT_TYPEID}/:loc`,
    pathMatch: 'full',
    component: CommentFragmentFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `fragment/:pid/${CHRONOLOGY_FRAGMENT_TYPEID}/:loc`,
    pathMatch: 'full',
    component: ChronologyFragmentFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `fragment/:pid/${PIN_LINKS_FRAGMENT_TYPEID}/:loc`,
    pathMatch: 'full',
    component: PinLinksFragmentFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
]);

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModuleForChild,
    // material
    MatButtonModule,
    MatCheckboxModule,
    MatCardModule,
    MatExpansionModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    MatToolbarModule,
    // cadmus
    AssertedHistoricalDateFeatureComponent,
    BibliographyPartFeatureComponent,
    CategoriesPartFeatureComponent,
    ChronologyFragmentFeatureComponent,
    ChronotopesPartFeatureComponent,
    CommentFragmentFeatureComponent,
    CommentPartFeatureComponent,
    DecoratedCountsPartFeatureComponent,
    DistrictLocationPartFeatureComponent,
    DocReferencesPartFeatureComponent,
    ExternalIdsPartFeatureComponent,
    HistoricalDatePartFeatureComponent,
    HistoricalEventsPartFeatureComponent,
    IndexKeywordsPartFeatureComponent,
    KeywordsPartFeatureComponent,
    MetadataPartFeatureComponent,
    NamesPartFeatureComponent,
    NotePartFeatureComponent,
    PhysicalMeasurementsPartFeatureComponent,
    PhysicalStatesPartFeatureComponent,
    PinLinksFragmentFeatureComponent,
    PinLinksPartFeatureComponent,
    TiledTextLayerPartFeatureComponent,
    TiledTextPartFeatureComponent,
    TokenTextLayerPartFeatureComponent,
    TokenTextPartFeatureComponent,
  ],
  exports: [
    AssertedHistoricalDateFeatureComponent,
    BibliographyPartFeatureComponent,
    CategoriesPartFeatureComponent,
    ChronologyFragmentFeatureComponent,
    ChronotopesPartFeatureComponent,
    CommentFragmentFeatureComponent,
    CommentPartFeatureComponent,
    DecoratedCountsPartFeatureComponent,
    DistrictLocationPartFeatureComponent,
    DocReferencesPartFeatureComponent,
    ExternalIdsPartFeatureComponent,
    HistoricalDatePartFeatureComponent,
    HistoricalEventsPartFeatureComponent,
    IndexKeywordsPartFeatureComponent,
    KeywordsPartFeatureComponent,
    MetadataPartFeatureComponent,
    NamesPartFeatureComponent,
    NotePartFeatureComponent,
    PhysicalMeasurementsPartFeatureComponent,
    PhysicalStatesPartFeatureComponent,
    PinLinksFragmentFeatureComponent,
    PinLinksPartFeatureComponent,
    TiledTextLayerPartFeatureComponent,
    TiledTextPartFeatureComponent,
    TokenTextLayerPartFeatureComponent,
    TokenTextPartFeatureComponent,
  ],
})
export class CadmusPartGeneralPgModule {}
