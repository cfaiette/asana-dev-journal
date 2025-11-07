import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ActivityEvent, TabMapping, TaskItem } from '../models/journal.models';

interface TaskResponse {
  tasks: TaskItem[];
}

interface ActivityResponse {
  events: ActivityEvent[];
}

interface TabResponse {
  tabs: TabMapping[];
}

@Injectable({ providedIn: 'root' })
export class TaskDataService {
  private readonly baseUrl = `${environment.apiBaseUrl}/journal`;

  constructor(private readonly http: HttpClient) {}

  loadTasks(): Observable<TaskItem[]> {
    return this.http.get<TaskResponse>(`${this.baseUrl}/tasks`).pipe(map((response) => response.tasks));
  }

  loadActivity(): Observable<ActivityEvent[]> {
    return this.http.get<ActivityResponse>(`${this.baseUrl}/activity`).pipe(map((response) => response.events));
  }

  loadTabs(): Observable<TabMapping[]> {
    return this.http.get<TabResponse>(`${this.baseUrl}/tabs`).pipe(map((response) => response.tabs));
  }
}
