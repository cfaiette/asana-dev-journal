import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TaskFilters } from '../../models/journal.models';
import { FilterPanelComponent } from './filter-panel.component';

describe('FilterPanelComponent', () => {
  let component: FilterPanelComponent;
  let fixture: ComponentFixture<FilterPanelComponent>;

  const filters: TaskFilters = {
    search: '',
    projects: [],
    sections: [],
    assignees: [],
    statuses: []
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterPanelComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FilterPanelComponent);
    component = fixture.componentInstance;
    component.projects = ['Journal'];
    component.sections = ['Todo'];
    component.assignees = ['Mina'];
    component.filters = filters;
    fixture.detectChanges();
  });

  it('emits filters when search input changes', fakeAsync(() => {
    let emitted: TaskFilters | null = null;
    component.filtersChange.subscribe((value) => (emitted = value));

    const input = fixture.debugElement.query(By.css('input[type="search"]')).nativeElement as HTMLInputElement;
    input.value = 'notes';
    input.dispatchEvent(new Event('input'));
    tick(250);

    expect(emitted?.search).toBe('notes');
  }));

  it('toggles checkbox selections', () => {
    const checkbox = fixture.debugElement.query(By.css('fieldset:nth-of-type(1) input'));
    checkbox.triggerEventHandler('change');
    expect(component.form.controls.projects.value).toEqual(['Journal']);
  });

  it('emits clear filters event', (done) => {
    component.clearFilters.subscribe(() => done());
    const button = fixture.debugElement.query(By.css('.filter-panel__clear'));
    button.triggerEventHandler('click');
  });
});
