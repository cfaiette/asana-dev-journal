import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { map, Subscription } from 'rxjs';
import { ActivityFeedComponent } from '../dashboard/activity-feed/activity-feed.component';
import { FilterPanelComponent } from '../dashboard/filter-panel/filter-panel.component';
import { TabManagerComponent } from '../dashboard/tab-manager/tab-manager.component';
import { TaskTableComponent } from '../dashboard/task-table/task-table.component';
import { AsanaAuthService } from '../services/asana-auth.service';
import { JournalStateService } from '../state/journal-state.service';
import { TaskFilters } from '../models/journal.models';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, TaskTableComponent, ActivityFeedComponent, TabManagerComponent, FilterPanelComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent implements OnDestroy {
  readonly user$ = this.journalState.user$;
  readonly tasks$ = this.journalState.filteredTasks$;
  readonly allTasks$ = this.journalState.tasks$;
  readonly activity$ = this.journalState.activity$;
  readonly tabs$ = this.journalState.tabs$;
  readonly selectedTab$ = this.journalState.selectedTab$;
  readonly filters$ = this.journalState.filters$;

  readonly filterOptions$ = this.allTasks$.pipe(
    map((tasks) => ({
      projects: Array.from(new Set(tasks.map((task) => task.metadata.project))).sort(),
      sections: Array.from(new Set(tasks.map((task) => task.metadata.section))).sort(),
      assignees: Array.from(
        new Set(tasks.map((task) => task.metadata.assignee).filter((v): v is string => !!v))
      ).sort()
    }))
  );

  loading = true;
  errorMessage = '';
  private subscription: Subscription;

  constructor(
    private readonly journalState: JournalStateService,
    private readonly authService: AsanaAuthService
  ) {
    this.subscription = this.journalState
      .loadInitialData()
      .subscribe({
        next: () => {
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Unable to load dashboard data. Please refresh to try again.';
        }
      });
  }

  connectAsana(): void {
    this.authService.startOAuth('/auth/callback');
  }

  onTabChange(tabId: string | null): void {
    this.journalState.selectTab(tabId);
  }

  onFiltersChange(filters: TaskFilters): void {
    this.journalState.updateFilters(filters);
  }

  onClearFilters(): void {
    this.journalState.clearFilters();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
