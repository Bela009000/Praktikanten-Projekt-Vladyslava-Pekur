import {
  Component,
  AfterViewInit,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  HostListener
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import {
  createIcons,
  ArrowLeft,
  Camera,
  Trash2,
  RefreshCw,
  PlayingCards,
  LogOut
} from 'lucide';

import { AuthService } from '../../services/auth.service';

const ICONS = {
  ArrowLeft,
  Camera,
  Trash2,
  RefreshCw,
  PlayingCards,
  LogOut
};

const USERNAME_ERRORS: Record<string, string> = {
  'auth/username-already-in-use':
    'Dieser Benutzername ist bereits registriert.',
  'auth/invalid-username': 'Der Benutzername ist ungültig.'
};

const PASSWORD_ERRORS: Record<string, string> = {
  'auth/invalid-credential': 'Das aktuelle Passwort ist falsch.',
  'auth/wrong-password': 'Das aktuelle Passwort ist falsch.',
  'auth/invalid-password': 'Das aktuelle Passwort ist falsch.',
  'auth/missing-current-password':
    'Bitte dein aktuelles Passwort eingeben.',
  'auth/weak-password': 'Das neue Passwort ist zu schwach.',
  'auth/requires-recent-login':
    'Bitte melde dich erneut an und versuche es danach noch einmal.',
  'auth/user-not-found': 'Benutzer konnte nicht gefunden werden.',
  'auth/user-disabled': 'Dieser Benutzer wurde deaktiviert.',
  'auth/too-many-requests':
    'Zu viele Versuche. Bitte später erneut versuchen.'
};

const AVATAR_ERRORS: Record<string, string> = {
  'avatar-too-large':
    'Das Bild ist zu groß. Bitte wähle ein kleineres Bild.',
  'avatar/invalid-file': 'Bitte wähle eine Bilddatei.'
};

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule
  ],
  templateUrl: './account.html',
  styleUrl: './account.css'
})
export class Account implements OnInit, AfterViewInit, OnDestroy {
  username = '';
  newUsername = '';

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  photoURL = '';

  usernameMessage = '';
  passwordMessage = '';
  avatarMessage = '';

  loading = true;
  avatarLoading = false;
  usernameLoading = false;
  passwordLoading = false;

  private destroyed = false;
  private subscription = new Subscription();

  constructor( //Angular передаёт сюда три объекта
    private router: Router,
    private authService: AuthService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.subscription.add(
      this.authService.photoURL$.subscribe(photoURL => { //Angular передаёт сюда три объекта.
        this.photoURL = photoURL || ''; //приходит фото
        this.update(); //обновление 
      })
    );

    await this.loadUserData();
  }

  ngAfterViewInit(): void {
    this.renderIcons();
  }

  ngOnDestroy(): void { //покидание странрицы 
    this.destroyed = true;
    this.subscription.unsubscribe();
  }

  private update(): void {
    if (!this.destroyed) {
      this.changeDetectorRef.detectChanges();
    }
  }

  private setUsername(name: string): void {
    this.username = name;
    this.newUsername = name;
  }

  private renderIcons(): void {
    setTimeout(() => {
      try {
        createIcons({ icons: ICONS });
      } catch (error) {
        console.error('LUCIDE ICON ERROR:', error);
      }
    }, 0);
  }

  async loadUserData(): Promise<void> {
    this.loading = true;

    try {
      const user = await this.authService.waitForAuth();

      if (!user) {
        await this.router.navigate(['/login']);
        return;
      }

      this.setUsername(user.displayName || '');

      await this.authService.refreshUserData();

      const refreshedUser = this.authService.currentUser;

      if (refreshedUser) {
        this.setUsername(refreshedUser.displayName || '');
      }
    } catch (error) {
      console.error('ACCOUNT ERROR:', error);
    } finally {
      this.loading = false;
      this.update();
      this.renderIcons();
    }
  }

  async refreshUserData(): Promise<void> {
    if (this.avatarLoading) {
      return;
    }

    this.avatarLoading = true;
    this.avatarMessage = 'Daten werden aktualisiert...';
    this.update();

    try {
      const result = await this.authService.refreshUserData();

      if (result?.user) {
        this.setUsername(result.user.displayName || '');
      }

      this.avatarMessage = 'Daten aktualisiert.';
    } catch (error) {
      console.error('REFRESH USER DATA ERROR:', error);

      this.avatarMessage = 'Daten konnten nicht aktualisiert werden.';
    } finally {
      this.avatarLoading = false;
      this.update();
      this.renderIcons();
    }
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  async saveUsername(): Promise<void> {
    if (this.usernameLoading) {
      return;
    }

    const username = this.newUsername.trim();

    this.usernameMessage = '';

    if (!username) {
      this.usernameMessage = 'Bitte einen Namen eingeben.';
    } else if (username.includes('@')) {
      this.usernameMessage =
        'Der Benutzername darf kein @-Zeichen enthalten.';
    } else if (username === this.username) {
      this.usernameMessage = 'Du verwendest bereits diesen Namen.';
    }

    if (this.usernameMessage) {
      this.update();
      return;
    }

    this.usernameLoading = true;

    try {
      await this.authService.changeUsername(username);

      const user = await this.authService.waitForAuth();

      if (user) {
        this.setUsername(user.displayName || '');
      }

      this.usernameMessage = 'Name erfolgreich geändert.';
    } catch (error: any) {
      console.error('CHANGE USERNAME ERROR:', error);

      this.usernameMessage =
        USERNAME_ERRORS[error?.code] ||
        'Der Name konnte nicht geändert werden.';
    } finally {
      this.usernameLoading = false;
      this.update();
    }
  }

  async changePassword(): Promise<void> {
    if (this.passwordLoading) {
      return;
    }

    this.passwordMessage = '';

    if (!this.currentPassword) {
      this.passwordMessage = 'Bitte dein aktuelles Passwort eingeben.';
    } else if (!this.newPassword) {
      this.passwordMessage = 'Bitte ein neues Passwort eingeben.';
    } else if (this.newPassword.length < 6) {
      this.passwordMessage =
        'Das neue Passwort muss mindestens 6 Zeichen lang sein.';
    } else if (this.newPassword !== this.confirmPassword) {
      this.passwordMessage = 'Die Passwörter stimmen nicht überein.';
    } else if (this.currentPassword === this.newPassword) {
      this.passwordMessage =
        'Das neue Passwort muss sich vom aktuellen unterscheiden.';
    }

    if (this.passwordMessage) {
      this.update();
      return;
    }

    this.passwordLoading = true;

    try {
      await this.authService.changePassword(
        this.currentPassword,
        this.newPassword
      );

      this.passwordMessage = 'Passwort erfolgreich geändert.';

      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
    } catch (error: any) {
      console.error('CHANGE PASSWORD ERROR:', error);

      this.passwordMessage =
        PASSWORD_ERRORS[error?.code] ||
        'Das Passwort konnte nicht geändert werden.';
    } finally {
      this.passwordLoading = false;
      this.update();
    }
  }

  changeAvatar(): void {
    if (this.loading || this.avatarLoading) {
      return;
    }

    const input = document.createElement('input');

    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async () => {
      const file = input.files?.[0];

      if (file) {
        await this.uploadAvatar(file);
      }
    };

    input.click();
  }

  @HostListener('paste', ['$event'])
  async pasteAvatar(event: ClipboardEvent): Promise<void> {
    if (this.loading || this.avatarLoading) {
      return;
    }

    const items = event.clipboardData?.items;

    if (!items) {
      return;
    }

    for (const item of Array.from(items)) {
      if (!item.type.startsWith('image/')) {
        continue;
      }

      const file = item.getAsFile();

      if (!file) {
        return;
      }

      event.preventDefault();

      await this.uploadAvatar(file);

      return;
    }
  }

  private async uploadAvatar(file: File): Promise<void> {
    if (this.avatarLoading) {
      return;
    }

    this.avatarLoading = true;
    this.avatarMessage = 'Avatar wird gespeichert...';
    this.update();

    try {
      this.photoURL = await this.authService.changeAvatarBase64(file);

      this.avatarMessage = 'Avatar erfolgreich geändert.';
    } catch (error: any) {
      console.error('UPLOAD AVATAR ERROR:', error);

      this.avatarMessage =
        AVATAR_ERRORS[error?.code] ||
        'Der Avatar konnte nicht gespeichert werden.';
    } finally {
      this.avatarLoading = false;
      this.update();
      this.renderIcons();
    }
  }

  async deleteAvatar(): Promise<void> {
    if (this.loading || this.avatarLoading) {
      return;
    }

    if (!this.photoURL) {
      this.avatarMessage = 'Es ist kein Avatar vorhanden.';
      this.update();
      return;
    }

    if (!window.confirm('Möchtest du deinen Avatar wirklich löschen?')) {
      return;
    }

    this.avatarLoading = true;
    this.avatarMessage = 'Avatar wird gelöscht...';
    this.update();

    try {
      await this.authService.deleteAvatar();

      this.photoURL = '';

      this.avatarMessage = 'Avatar erfolgreich gelöscht.';
    } catch (error) {
      console.error('DELETE AVATAR ERROR:', error);

      this.avatarMessage = 'Der Avatar konnte nicht gelöscht werden.';
    } finally {
      this.avatarLoading = false;
      this.update();
      this.renderIcons();
    }
  }
}