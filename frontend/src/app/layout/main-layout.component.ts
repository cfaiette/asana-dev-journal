import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
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
import { environment } from '../../environments/environment';

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
  toastMessage = '';
  toastSuccess = false;
  private subscription: Subscription;
  private toastTimeout?: number;

  constructor(
    private readonly journalState: JournalStateService,
    private readonly authService: AsanaAuthService,
    private readonly http: HttpClient
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

  testBackend(): void {
    this.showToast('Testing backend connection...', true);
    this.http.get<{ status: string }>('/health').subscribe({
      next: (response) => {
        const statusText = response?.status || 'ok';
        this.showToast(`✅ Backend connected! Status: ${statusText}`, true);
      },
      error: (error) => {
        console.error('Backend test error:', error);
        let message = '❌ Cannot reach backend. Is it running?';
        let isSuccess = false;
        
        if (error.status === 200) {
          message = '✅ Backend is reachable! (Response received)';
          isSuccess = true;
        } else if (error.status) {
          message = `❌ Backend error: ${error.status} ${error.statusText || error.message || ''}`;
        } else if (error.message) {
          message = `❌ Error: ${error.message}`;
        }
        
        this.showToast(message, isSuccess);
      }
    });
  }

  private showToast(message: string, success: boolean): void {
    this.toastMessage = message;
    this.toastSuccess = success;
    
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    
    this.toastTimeout = window.setTimeout(() => {
      this.toastMessage = '';
    }, 5000);
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
