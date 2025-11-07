import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, Subject, takeUntil } from 'rxjs';
import { TaskFilters, TaskStatus } from '../../models/journal.models';

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './filter-panel.component.html',
  styleUrl: './filter-panel.component.scss'
})
export class FilterPanelComponent implements OnDestroy {
  @Input() projects: string[] = [];
  @Input() sections: string[] = [];
  @Input() assignees: string[] = [];
  @Input() statuses: TaskStatus[] = ['incomplete', 'complete', 'blocked', 'in_review', 'unknown'];
  @Input() set filters(filters: TaskFilters) {
    this.form.patchValue(filters, { emitEvent: false });
  }

  @Output() filtersChange = new EventEmitter<TaskFilters>();
  @Output() clearFilters = new EventEmitter<void>();

  readonly statusLabels: Record<TaskStatus, string> = {
    incomplete: 'Incomplete',
    complete: 'Complete',
    blocked: 'Blocked',
    in_review: 'In review',
    unknown: 'Unknown'
  };

  readonly form = this.fb.nonNullable.group({
    search: [''],
    projects: [[] as string[]],
    sections: [[] as string[]],
    assignees: [[] as string[]],
    statuses: [[] as TaskStatus[]]
  });

  private readonly destroy$ = new Subject<void>();

  constructor(private readonly fb: FormBuilder) {
    this.form.valueChanges
      .pipe(debounceTime(200), takeUntil(this.destroy$))
      .subscribe((value) => this.filtersChange.emit(value));
  }

  toggleSelection(field: 'projects' | 'sections' | 'assignees', value: string): void {
    const control = this.form.controls[field];
    const current = [...control.value];
    const index = current.indexOf(value);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(value);
    }
    control.setValue(current);
  }

  toggleStatus(status: TaskStatus): void {
    const control = this.form.controls.statuses;
    const current = [...control.value];
    const index = current.indexOf(status);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(status);
    }
    control.setValue(current);
  }

  onClear(): void {
    this.clearFilters.emit();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
