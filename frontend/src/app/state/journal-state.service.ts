import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, forkJoin, map, Observable, tap } from 'rxjs';
import {
  ActivityEvent,
  AsanaUser,
  TabMapping,
  TaskFilters,
  TaskItem,
  defaultFilters
} from '../models/journal.models';
import { TaskDataService } from '../services/task-data.service';

@Injectable({ providedIn: 'root' })
export class JournalStateService {
  private readonly userSubject = new BehaviorSubject<AsanaUser | null>(null);
  private readonly tasksSubject = new BehaviorSubject<TaskItem[]>([]);
  private readonly activitySubject = new BehaviorSubject<ActivityEvent[]>([]);
  private readonly tabsSubject = new BehaviorSubject<TabMapping[]>([]);
  private readonly selectedTabSubject = new BehaviorSubject<string | null>(null);
  private readonly filtersSubject = new BehaviorSubject<TaskFilters>(defaultFilters);

  readonly user$ = this.userSubject.asObservable();
  readonly tasks$ = this.tasksSubject.asObservable();
  readonly activity$ = this.activitySubject.asObservable();
  readonly tabs$ = this.tabsSubject.asObservable();
  readonly selectedTab$ = this.selectedTabSubject.asObservable();
  readonly filters$ = this.filtersSubject.asObservable();

  readonly filteredTasks$ = combineLatest([
    this.tasks$,
    this.selectedTab$,
    this.filters$
  ]).pipe(
    map(([tasks, selectedTab, filters]) => this.applyFilters(tasks, selectedTab, filters))
  );

  constructor(private readonly taskData: TaskDataService) {}

  loadInitialData(): Observable<void> {
    return forkJoin({
      tasks: this.taskData.loadTasks(),
      activity: this.taskData.loadActivity(),
      tabs: this.taskData.loadTabs()
    }).pipe(
      tap(({ tasks, activity, tabs }) => {
        this.setTasks(tasks);
        this.setActivity(activity);
        this.setTabs(tabs);
      }),
      map(() => void 0)
    );
  }

  setAuthenticatedUser(user: AsanaUser): void {
    this.userSubject.next(user);
  }

  setTasks(tasks: TaskItem[]): void {
    this.tasksSubject.next(tasks);
    this.syncTabsFromTasks(tasks);
  }

  setActivity(activity: ActivityEvent[]): void {
    this.activitySubject.next(activity);
  }

  setTabs(tabs: TabMapping[]): void {
    this.tabsSubject.next(tabs);
    if (!this.selectedTabSubject.value && tabs.length) {
      this.selectedTabSubject.next(tabs[0].id);
    }
  }

  updateFilters(partial: Partial<TaskFilters>): void {
    const current = this.filtersSubject.value;
    this.filtersSubject.next({ ...current, ...partial });
  }

  clearFilters(): void {
    this.filtersSubject.next(defaultFilters);
  }

  selectTab(tabId: string | null): void {
    this.selectedTabSubject.next(tabId);
  }

  private applyFilters(tasks: TaskItem[], selectedTabId: string | null, filters: TaskFilters): TaskItem[] {
    return tasks
      .filter((task) => {
        if (!selectedTabId) {
          return true;
        }
        return this.tabsSubject.value.some(
          (tab) => tab.id === selectedTabId && tab.project === task.metadata.project && tab.section === task.metadata.section
        );
      })
      .filter((task) => {
        if (!filters.search) {
          return true;
        }
        const needle = filters.search.toLowerCase();
        return (
          task.name.toLowerCase().includes(needle) ||
          task.notes.some((note) => note.content.toLowerCase().includes(needle))
        );
      })
      .filter((task) =>
        !filters.projects.length || filters.projects.includes(task.metadata.project)
      )
      .filter((task) =>
        !filters.sections.length || filters.sections.includes(task.metadata.section)
      )
      .filter((task) =>
        !filters.assignees.length || (task.metadata.assignee && filters.assignees.includes(task.metadata.assignee))
      )
      .filter((task) =>
        !filters.statuses.length || filters.statuses.includes(task.metadata.status)
      );
  }

  private syncTabsFromTasks(tasks: TaskItem[]): void {
    const existingTabs = new Map(this.tabsSubject.value.map((tab) => [tab.id, tab] as const));
    const derivedTabs = new Map<string, TabMapping>();

    tasks.forEach((task) => {
      const id = `${task.metadata.project}::${task.metadata.section}`;
      if (!derivedTabs.has(id)) {
        derivedTabs.set(id, {
          id,
          label: `${task.metadata.project} / ${task.metadata.section}`,
          project: task.metadata.project,
          section: task.metadata.section
        });
      }
    });

    const mergedTabs = Array.from(new Map([...existingTabs, ...derivedTabs]).values());
    this.tabsSubject.next(mergedTabs);

    if (!this.selectedTabSubject.value && mergedTabs.length) {
      this.selectedTabSubject.next(mergedTabs[0].id);
    } else if (
      this.selectedTabSubject.value &&
      !mergedTabs.some((tab) => tab.id === this.selectedTabSubject.value)
    ) {
      this.selectedTabSubject.next(mergedTabs[0]?.id ?? null);
    }
  }
}
