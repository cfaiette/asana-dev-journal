import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { AsanaAuthService } from '../services/asana-auth.service';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oauth-callback.component.html',
  styleUrl: './oauth-callback.component.scss'
})
export class OauthCallbackComponent implements OnDestroy {
  status: 'pending' | 'success' | 'error' = 'pending';
  message = 'Completing sign-in with Asana…';
  private subscription?: Subscription;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AsanaAuthService
  ) {
    this.subscription = this.route.queryParamMap.subscribe((params) => {
      const error = params.get('error');
      const code = params.get('code');
      const state = params.get('state') ?? undefined;

      if (error) {
        this.status = 'error';
        this.message = decodeURIComponent(error);
        return;
      }

      if (!code) {
        this.status = 'error';
        this.message = 'Authorization code missing from callback.';
        return;
      }

      this.subscription = this.authService.handleCallback(code, state).subscribe({
        next: () => {
          this.status = 'success';
          this.message = 'Asana account linked successfully. Redirecting…';
          setTimeout(() => this.router.navigateByUrl('/'), 800);
        },
        error: () => {
          this.status = 'error';
          this.message = 'Unable to finalize Asana authorization. Please try again.';
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
