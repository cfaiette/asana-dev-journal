import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout.component';
import { OauthCallbackComponent } from './auth/oauth-callback.component';

export const routes: Routes = [
  { path: '', component: MainLayoutComponent },
  { path: 'auth/callback', component: OauthCallbackComponent },
  { path: '**', redirectTo: '' }
];
