import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { take } from 'rxjs/operators';
import { ActivityEvent, TabMapping, TaskItem } from '../models/journal.models';
import { TaskDataService } from '../services/task-data.service';
import { JournalStateService } from './journal-state.service';

describe('JournalStateService', () => {
  const tasks: TaskItem[] = [
    {
      id: '1',
      name: 'Draft meeting notes',
      metadata: {
        project: 'Dev Journal',
        section: 'To Do',
        assignee: 'Sam',
        dueDate: '2024-04-10T00:00:00Z',
        status: 'incomplete'
      },
      notes: [],
      lastUpdated: '2024-04-09T10:00:00Z'
    },
    {
      id: '2',
      name: 'Publish recap',
      metadata: {
        project: 'Dev Journal',
        section: 'Review',
        assignee: 'Jess',
        dueDate: '2024-04-09T00:00:00Z',
        status: 'in_review'
      },
      notes: [
        {
          id: 'n1',
          taskId: '2',
          content: 'Waiting on approval',
          updatedAt: '2024-04-08T14:00:00Z'
        }
      ],
      lastUpdated: '2024-04-09T12:30:00Z'
    }
  ];
  const activity: ActivityEvent[] = [
    {
      id: 'a1',
      type: 'comment',
      description: 'Added note',
      occurredAt: '2024-04-09T12:35:00Z',
      taskId: '2'
    }
  ];
  const tabs: TabMapping[] = [
    {
      id: 'Dev Journal::To Do',
      label: 'Dev Journal / To Do',
      project: 'Dev Journal',
      section: 'To Do'
    }
  ];

  let service: JournalStateService;

  beforeEach(() => {
    const taskDataStub: Partial<TaskDataService> = {
      loadTasks: jasmine.createSpy('loadTasks').and.returnValue(of(tasks)),
      loadActivity: jasmine.createSpy('loadActivity').and.returnValue(of(activity)),
      loadTabs: jasmine.createSpy('loadTabs').and.returnValue(of(tabs))
    };

    TestBed.configureTestingModule({
      providers: [{ provide: TaskDataService, useValue: taskDataStub }, JournalStateService]
    });

    service = TestBed.inject(JournalStateService);
  });

  it('loads initial data and exposes tasks', (done) => {
    service.loadInitialData().subscribe(() => {
      service.tasks$.pipe(take(1)).subscribe((loaded) => {
        expect(loaded.length).toBe(2);
        done();
      });
    });
  });

  it('filters tasks by search and status', (done) => {
    service.setTasks(tasks);
    service.updateFilters({ search: 'publish', statuses: ['in_review'] });

    service.filteredTasks$.pipe(take(1)).subscribe((filtered) => {
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('2');
      done();
    });
  });

  it('derives tabs from tasks when missing', (done) => {
    service.setTabs([]);
    service.setTasks(tasks);

    service.tabs$.pipe(take(1)).subscribe((result) => {
      expect(result.some((tab) => tab.project === 'Dev Journal' && tab.section === 'To Do')).toBeTrue();
      done();
    });
  });
});
