import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { TaskItem } from '../../models/journal.models';

interface SortState {
  column: keyof TaskItem | 'project' | 'section' | 'assignee' | 'dueDate' | 'status' | 'lastUpdated';
  direction: 'asc' | 'desc';
}

@Component({
  selector: 'app-task-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-table.component.html',
  styleUrl: './task-table.component.scss'
})
export class TaskTableComponent implements OnChanges {
  @Input() tasks: TaskItem[] = [];

  displayedTasks: TaskItem[] = [];
  sortState: SortState = { column: 'lastUpdated', direction: 'desc' };
  expandedNotes = new Set<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tasks']) {
      this.applySort();
    }
  }

  toggleSort(column: SortState['column']): void {
    if (this.sortState.column === column) {
      this.sortState = {
        column,
        direction: this.sortState.direction === 'asc' ? 'desc' : 'asc'
      };
    } else {
      this.sortState = { column, direction: 'asc' };
    }
    this.applySort();
  }

  toggleNotes(taskId: string): void {
    if (this.expandedNotes.has(taskId)) {
      this.expandedNotes.delete(taskId);
    } else {
      this.expandedNotes.add(taskId);
    }
  }

  isExpanded(taskId: string): boolean {
    return this.expandedNotes.has(taskId);
  }

  trackByTaskId(_: number, task: TaskItem): string {
    return task.id;
  }

  private applySort(): void {
    const column = this.sortState.column;
    const direction = this.sortState.direction === 'asc' ? 1 : -1;
    this.displayedTasks = [...this.tasks].sort((a, b) => {
      const aValue = this.resolveValue(a, column);
      const bValue = this.resolveValue(b, column);
      return aValue.localeCompare(bValue, undefined, { sensitivity: 'base' }) * direction;
    });
  }

  private resolveValue(task: TaskItem, column: SortState['column']): string {
    switch (column) {
      case 'project':
        return task.metadata.project;
      case 'section':
        return task.metadata.section;
      case 'assignee':
        return task.metadata.assignee ?? '';
      case 'dueDate':
        return task.metadata.dueDate ?? '';
      case 'status':
        return task.metadata.status;
      case 'lastUpdated':
        return task.lastUpdated;
      default:
        return String((task as unknown as Record<string, unknown>)[column] ?? '');
    }
  }
}
