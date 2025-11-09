import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AsanaUser } from '../models/journal.models';
import { JournalStateService } from '../state/journal-state.service';

interface OAuthResponse {
  user: AsanaUser;
  accessToken: string;
}

@Injectable({ providedIn: 'root' })
export class AsanaAuthService {
  private readonly authUrl = `${environment.apiBaseUrl}/auth/asana`;

  constructor(
    private readonly http: HttpClient,
    private readonly journalState: JournalStateService,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  startOAuth(redirectPath: string): void {
    const backendUrl = environment.backendUrl || 'http://127.0.0.1:51910';
    const url = new URL(`${backendUrl}${this.authUrl}/start`);
    url.searchParams.set('redirect_uri', `${this.document.location.origin}${redirectPath}`);
    this.document.location.href = url.toString();
  }

  handleCallback(code: string, state?: string): Observable<AsanaUser> {
    const params = new HttpParams().set('code', code).set('state', state ?? '');
    return this.http
      .get<OAuthResponse>(`${this.authUrl}/callback`, { params })
      .pipe(
        tap((response) => this.journalState.setAuthenticatedUser(response.user)),
        map((response) => response.user)
      );
  }
}
