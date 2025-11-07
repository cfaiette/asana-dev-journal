import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TaskItem } from '../../models/journal.models';
import { TaskTableComponent } from './task-table.component';

describe('TaskTableComponent', () => {
  let component: TaskTableComponent;
  let fixture: ComponentFixture<TaskTableComponent>;

  const tasks: TaskItem[] = [
    {
      id: '1',
      name: 'Write summary',
      metadata: {
        project: 'Journal',
        section: 'Todo',
        assignee: 'Mina',
        dueDate: '2024-04-10T00:00:00Z',
        status: 'incomplete'
      },
      notes: [],
      lastUpdated: '2024-04-10T12:00:00Z'
    },
    {
      id: '2',
      name: 'Collect feedback',
      metadata: {
        project: 'Journal',
        section: 'Review',
        assignee: 'Jon',
        dueDate: '2024-04-09T00:00:00Z',
        status: 'in_review'
      },
      notes: [],
      lastUpdated: '2024-04-09T12:00:00Z'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskTableComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskTableComponent);
    component = fixture.componentInstance;
    component.tasks = tasks;
    component.ngOnChanges({ tasks: { currentValue: tasks, previousValue: [], firstChange: true, isFirstChange: () => true } });
    fixture.detectChanges();
  });

  it('sorts tasks by last updated descending by default', () => {
    expect(component.displayedTasks[0].id).toBe('1');
  });

  it('toggles sorting when header clicked', () => {
    const buttons = fixture.debugElement.queryAll(By.css('th button'));
    const taskHeader = buttons[0];
    taskHeader.triggerEventHandler('click');
    fixture.detectChanges();
    expect(component.sortState.column).toBe('name');
    expect(component.sortState.direction).toBe('asc');
    expect(component.displayedTasks[0].id).toBe('2');
  });

  it('expands and collapses notes panel', () => {
    const toggle = fixture.debugElement.query(By.css('.task-table__note-toggle'));
    toggle.triggerEventHandler('click');
    fixture.detectChanges();
    expect(component.isExpanded('1')).toBeTrue();
    toggle.triggerEventHandler('click');
    fixture.detectChanges();
    expect(component.isExpanded('1')).toBeFalse();
  });
});
