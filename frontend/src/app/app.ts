import {
  AfterViewInit,
  Component,
  OnInit
} from '@angular/core';

import {
  Router,
  RouterOutlet,
  RouterLink,
  NavigationEnd
} from '@angular/router';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { filter } from 'rxjs/operators';

import {
  createIcons,
  ArrowLeft,
  Camera,
  User,
  UserPen,
  Trash2,
  LogOut,
  PlayingCards,
  PlayingCardsFan,
  GraduationCap,
  Brain,
  RefreshCw
} from 'lucide';

import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    CommonModule,
    FormsModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App
  implements OnInit, AfterViewInit {

  username = '';
  photoURL = '';

  accountOpen = false;
  usernameEditorOpen = false;

  newUsername = '';

  usernameMessage = '';
  usernameSuccess = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {

    this.authService.userData$
      .subscribe(data => {

        if (!data) {
          return;
        }

        this.username =
          data.username || '';

        this.newUsername =
          this.username;

        this.photoURL =
          data.photoURL || '';

        this.refreshIcons();
      });

    this.authService.photoURL$
      .subscribe(photoURL => {

        this.photoURL =
          photoURL || '';

        this.refreshIcons();
      });

    this.router.events
      .pipe(
        filter(
          event =>
            event instanceof NavigationEnd
        )
      )
      .subscribe(() => {

        this.refreshIcons();
      });
  }

  ngAfterViewInit(): void {
    this.refreshIcons();
  }

  private refreshIcons(): void {

    setTimeout(() => {

      createIcons({
        icons: {
          ArrowLeft,
          Camera,
          User,
          UserPen,
          Trash2,
          LogOut,
          PlayingCards,
          PlayingCardsFan,
          GraduationCap,
          Brain,
          RefreshCw
        }
      });

    }, 0);
  }

  onDocumentClick(
    event: MouseEvent
  ): void {

    const target =
      event.target as HTMLElement;

    const accountWrapper =
      target.closest(
        '.account-wrapper'
      );

    if (!accountWrapper) {

      this.accountOpen =
        false;

      this.usernameEditorOpen =
        false;

      this.usernameMessage =
        '';
    }
  }

  isLernkartenActive(): boolean {

    return this.router.url
      .startsWith('/my-cards');
  }

  isLoginPage(): boolean {

    return (
      this.router.url === '/login' ||
      this.router.url === '/register'
    );
  }

  isThemenActive(): boolean {

    return (
      this.router.url === '/topics' ||
      this.router.url.startsWith('/topic/') ||
      this.router.url.startsWith('/cards/') ||
      this.router.url.startsWith('/lernmodus/')
    );
  }

  isQuizActive(): boolean {

    return this.router.url === '/quiz';
  }

  toggleAccount(): void {

    this.accountOpen =
      !this.accountOpen;

    if (!this.accountOpen) {

      this.usernameEditorOpen =
        false;

      this.usernameMessage =
        '';
    }

    this.refreshIcons();
  }

  openUsernameEditor(): void {

    this.usernameEditorOpen =
      !this.usernameEditorOpen;

    this.newUsername =
      this.username;

    this.usernameMessage =
      '';

    this.usernameSuccess =
      false;

    this.refreshIcons();
  }

  async changeUsername(): Promise<void> {

    const username =
      this.newUsername.trim();

    this.usernameMessage =
      '';

    this.usernameSuccess =
      false;

    if (!username) {

      this.usernameMessage =
        'Bitte gib einen Namen ein.';

      return;
    }

    if (username.includes('@')) {

      this.usernameMessage =
        'Der Benutzername darf kein @-Zeichen enthalten.';

      return;
    }

    if (username === this.username) {

      this.usernameMessage =
        'Du verwendest bereits diesen Namen.';

      return;
    }

    try {

      await this.authService
        .changeUsername(username);

      this.username =
        username;

      this.newUsername =
        username;

      this.usernameSuccess =
        true;

      this.usernameMessage =
        'Der Name wurde erfolgreich geändert.';

    } catch (error: any) {

      this.usernameSuccess =
        false;

      if (
        error?.code ===
        'auth/username-already-in-use'
      ) {

        this.usernameMessage =
          'Dieser Benutzername ist bereits registriert.';

      } else if (
        error?.code ===
        'auth/invalid-username'
      ) {

        this.usernameMessage =
          'Dieser Benutzername ist nicht gültig.';

      } else {

        this.usernameMessage =
          'Der Name konnte nicht geändert werden.';
      }
    }
  }

  async refreshUserData(): Promise<void> {

    try {

      const result =
        await this.authService
          .refreshUserData();

      if (!result) {

        this.username = '';
        this.photoURL = '';

        return;
      }

      this.username =
        result.data?.username ||
        result.user.displayName ||
        '';

      this.newUsername =
        this.username;

      this.photoURL =
        result.data?.photoURL ||
        '';

      this.refreshIcons();

    } catch (error) {

      console.error(
        'TOPBAR REFRESH ERROR:',
        error
      );
    }
  }

  async deleteAccount(): Promise<void> {

    const confirmed =
      confirm(
        'Möchtest du dein Konto wirklich löschen? ' +
        'Alle deine Themen, Lernkarten und Quiz-Daten werden gelöscht.'
      );

    if (!confirmed) {
      return;
    }

    try {

      await this.authService
        .deleteAccount();

      this.username = '';
      this.photoURL = '';

      this.accountOpen =
        false;

      this.usernameEditorOpen =
        false;

      await this.router
        .navigate(['/login']);

    } catch (error: any) {

      console.error(
        'DELETE ACCOUNT ERROR:',
        error
      );

      if (
        error?.code ===
        'auth/requires-recent-login'
      ) {

        alert(
          'Bitte melde dich erneut an und versuche es danach noch einmal.'
        );

      } else {

        alert(
          'Das Konto konnte nicht gelöscht werden. Bitte versuche es erneut.'
        );
      }
    }
  }

  async logout(): Promise<void> {

    await this.authService
      .logout();

    this.username = '';
    this.photoURL = '';

    this.accountOpen =
      false;

    this.usernameEditorOpen =
      false;

    await this.router
      .navigate(['/login']);
  }

  get userInitial(): string {

    return this.username
      ? this.username
          .charAt(0)
          .toUpperCase()
      : '?';
  }
}