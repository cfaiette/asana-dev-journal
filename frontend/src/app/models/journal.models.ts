export interface AsanaUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface TaskNote {
  id: string;
  taskId: string;
  content: string;
  updatedAt: string;
}

export type TaskStatus = 'incomplete' | 'complete' | 'blocked' | 'in_review' | 'unknown';

export interface TaskMetadata {
  project: string;
  section: string;
  assignee?: string;
  dueDate?: string;
  status: TaskStatus;
}

export interface TaskItem {
  id: string;
  name: string;
  metadata: TaskMetadata;
  notes: TaskNote[];
  lastUpdated: string;
}

export interface ActivityEvent {
  id: string;
  taskId?: string;
  occurredAt: string;
  type: string;
  description: string;
  actor?: string;
}

export interface TabMapping {
  id: string;
  label: string;
  project: string;
  section?: string;
}

export interface TaskFilters {
  search?: string;
  projects: string[];
  sections: string[];
  assignees: string[];
  statuses: TaskStatus[];
}

export const defaultFilters: TaskFilters = {
  search: '',
  projects: [],
  sections: [],
  assignees: [],
  statuses: []
};
