import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { MatButton } from '@angular/material/button';
import {
  MatCard,
  MatCardAvatar,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';

import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import {
  HistoryService,
  ItemService,
  MessagingService,
  UserLevelService,
} from '@myrmidon/cadmus-api';
import { FacetDefinition, FlagDefinition, Item } from '@myrmidon/cadmus-core';
import { AppRepository } from '@myrmidon/cadmus-state';
import { ItemMetadataEditorComponent } from '@myrmidon/cadmus-item-editor';
import { MESSAGE_ITEM_LIST_REPOSITORY_RESET } from '@myrmidon/cadmus-item-list';

import { ItemHistoryAdapter } from '../../services/history-adapters';
import { ModelHistoryViewComponent } from '../model-history-view/model-history-view.component';

/**
 * Get the bitmask of the flags which a user with the specified level
 * cannot change: the admin flags for non-admin users, else 0.
 *
 * @param flags The flags definitions.
 * @param userLevel The user level.
 */
export function getAdminFlagsMask(
  flags: FlagDefinition[],
  userLevel: number,
): number {
  if (userLevel >= 4) {
    return 0;
  }
  return flags
    .filter((f) => f.isAdmin)
    .reduce((mask, f) => mask | f.id, 0);
}

/**
 * Page showing the edit history of an item's metadata. Its route is the
 * item editor route with a final `/history` (`items/:id/history`). Each
 * version is displayed in a read-only `ItemMetadataEditorComponent`.
 */
@Component({
  selector: 'cadmus-item-history-page',
  templateUrl: './item-history-page.component.html',
  styleUrls: ['./item-history-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButton,
    MatCard,
    MatCardAvatar,
    MatCardContent,
    MatCardHeader,
    MatCardSubtitle,
    MatCardTitle,
    MatIcon,
    ModelHistoryViewComponent,
    ItemMetadataEditorComponent,
  ],
})
export class ItemHistoryPageComponent implements OnInit {
  private readonly _router = inject(Router);
  private readonly _appRepository = inject(AppRepository);
  private readonly _userLevelService = inject(UserLevelService);
  private readonly _messaging = inject(MessagingService);

  public readonly itemId: string;

  /**
   * The history data adapter.
   */
  public readonly adapter: ItemHistoryAdapter;

  public readonly facets = toSignal(this._appRepository.facets$, {
    initialValue: [] as FacetDefinition[],
  });
  public readonly flags = toSignal(this._appRepository.flags$, {
    initialValue: [] as FlagDefinition[],
  });

  /**
   * The current user level.
   */
  public readonly userLevel: () => number;

  constructor() {
    this.itemId = inject(ActivatedRoute).snapshot.params['id'];
    const user = toSignal(inject(AuthJwtService).currentUser$, {
      initialValue: null,
    });
    this.userLevel = computed(() => {
      user();
      return this._userLevelService.getCurrentUserLevel();
    });
    this.adapter = new ItemHistoryAdapter(
      this.itemId,
      inject(HistoryService),
      inject(ItemService),
      () => getAdminFlagsMask(this.flags(), this.userLevel()),
    );
  }

  public async ngOnInit(): Promise<void> {
    // ensure app data (facets, flags) are loaded
    try {
      await this._appRepository.load();
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Called after a version was restored: the items list must be refreshed.
   */
  public onRestored(): void {
    this._messaging.sendMessage(MESSAGE_ITEM_LIST_REPOSITORY_RESET);
  }

  /**
   * Close the history and go back to the items list.
   */
  public close(): void {
    this._router.navigate(['/items']);
  }

  /**
   * Open the item's editor.
   */
  public edit(): void {
    this._router.navigate(['/items', this.itemId]);
  }

  /**
   * Cast a history entry data to an item, for the template.
   */
  public asItem(data: unknown): Item {
    return data as Item;
  }
}
