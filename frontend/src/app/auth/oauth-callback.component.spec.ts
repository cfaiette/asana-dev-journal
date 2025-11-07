import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AsanaAuthService } from '../services/asana-auth.service';
import { OauthCallbackComponent } from './oauth-callback.component';

describe('OauthCallbackComponent', () => {
  let fixture: ComponentFixture<OauthCallbackComponent>;
  let service: jasmine.SpyObj<AsanaAuthService>;
  let paramMap$: BehaviorSubject<ParamMap>;

  beforeEach(async () => {
    paramMap$ = new BehaviorSubject<ParamMap>(convertToParamMap({ code: 'abc' }));
    service = jasmine.createSpyObj('AsanaAuthService', ['handleCallback']);
    service.handleCallback.and.returnValue(of({ id: '1', name: 'Test User', email: 'test@example.com' }));

    await TestBed.configureTestingModule({
      imports: [OauthCallbackComponent],
      providers: [
        { provide: AsanaAuthService, useValue: service },
        { provide: Router, useValue: { navigateByUrl: jasmine.createSpy('navigateByUrl') } },
        { provide: ActivatedRoute, useValue: { queryParamMap: paramMap$.asObservable() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OauthCallbackComponent);
    fixture.detectChanges();
  });

  it('completes callback successfully', () => {
    const component = fixture.componentInstance;
    expect(service.handleCallback).toHaveBeenCalledWith('abc', undefined);
    expect(component.status).toBe('success');
  });

  it('handles error parameter from callback', () => {
    paramMap$.next(convertToParamMap({ error: 'denied' }));
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.status).toBe('error');
    expect(component.message).toContain('denied');
  });

  it('handles exchange errors gracefully', () => {
    service.handleCallback.and.returnValue(throwError(() => new Error('network')));
    paramMap$.next(convertToParamMap({ code: 'def' }));
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.status).toBe('error');
    expect(component.message).toContain('Unable to finalize');
  });
});
