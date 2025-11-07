import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ActivityEvent } from '../../models/journal.models';

@Component({
  selector: 'app-activity-feed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activity-feed.component.html',
  styleUrl: './activity-feed.component.scss'
})
export class ActivityFeedComponent {
  @Input() events: ActivityEvent[] = [];
}
