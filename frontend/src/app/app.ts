import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { onAuthStateChanged } from 'firebase/auth';
import { createIcons, PlayingCards, User, UserPen, Trash2, LogOut } from 'lucide';
import { auth } from './firebase.config';
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
export class App implements OnInit, AfterViewInit {
  username = '';
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
    onAuthStateChanged(auth, (user) => {
      this.username = user?.displayName || '';
    });
  }

  ngAfterViewInit(): void {
    this.renderIcons();
  }

  private renderIcons(): void {
    createIcons({
      icons: {
        PlayingCards,
        User,
        UserPen,
        Trash2,
        LogOut
      }
    });
  }

  isLernkartenActive(): boolean {
    return this.router.url.startsWith('/my-cards');
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
    this.accountOpen = !this.accountOpen;

    if (!this.accountOpen) {
      this.usernameEditorOpen = false;
      this.usernameMessage = '';
    }

    setTimeout(() => {
      this.renderIcons();
    });
  }

  openUsernameEditor(): void {
    this.usernameEditorOpen = !this.usernameEditorOpen;
    this.newUsername = this.username;
    this.usernameMessage = '';
    this.usernameSuccess = false;

    setTimeout(() => {
      this.renderIcons();
    });
  }

  async changeUsername(): Promise<void> {
    const username = this.newUsername.trim();

    if (username === '') {
      this.usernameSuccess = false;
      this.usernameMessage = 'Bitte gib einen Namen ein.';
      return;
    }

    if (username.includes('@')) {
      this.usernameSuccess = false;
      this.usernameMessage =
        'Der Benutzername darf kein @-Zeichen enthalten.';
      return;
    }

    if (username === this.username) {
      this.usernameSuccess = false;
      this.usernameMessage =
        'Du verwendest bereits diesen Namen.';
      return;
    }

    try {
      await this.authService.changeUsername(username);

      this.username = username;
      this.newUsername = username;
      this.usernameSuccess = true;
      this.usernameMessage =
        'Der Name wurde erfolgreich geändert.';
    } catch (error: any) {
      this.usernameSuccess = false;

      if (error.code === 'auth/username-already-in-use') {
        this.usernameMessage =
          'Dieser Benutzername ist bereits registriert.';
      } else if (error.code === 'auth/invalid-username') {
        this.usernameMessage =
          'Dieser Benutzername ist nicht gültig.';
      } else {
        this.usernameMessage =
          'Der Name konnte nicht geändert werden.';
      }
    }
  }

  async deleteAccount(): Promise<void> {
    const confirmed = confirm(
      'Möchtest du dein Konto wirklich löschen? Alle deine Themen, Lernkarten und Quiz-Daten werden gelöscht.'
    );

    if (!confirmed) {
      return;
    }

    try {
      await this.authService.deleteAccount();

      this.accountOpen = false;
      this.usernameEditorOpen = false;

      await this.router.navigate(['/login']);
    } catch (error: any) {
      console.error('DELETE ACCOUNT ERROR:', error);

      if (error.code === 'auth/requires-recent-login') {
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
    await this.authService.logout();
    this.accountOpen = false;
    await this.router.navigate(['/login']);
  }

  get userInitial(): string {
    return this.username
      ? this.username.charAt(0).toUpperCase()
      : '?';
  }
}