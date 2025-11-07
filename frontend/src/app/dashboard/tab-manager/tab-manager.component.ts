import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TabMapping } from '../../models/journal.models';

@Component({
  selector: 'app-tab-manager',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tab-manager.component.html',
  styleUrl: './tab-manager.component.scss'
})
export class TabManagerComponent {
  @Input() tabs: TabMapping[] = [];
  @Input() selectedTabId: string | null = null;
  @Output() tabChange = new EventEmitter<string | null>();

  selectTab(tabId: string | null): void {
    this.tabChange.emit(tabId);
  }
}
