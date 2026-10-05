import {
  Component,
  AfterViewInit,
  OnInit,
  ChangeDetectorRef,
  HostListener
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

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
export class Account implements OnInit, AfterViewInit {
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

  constructor(
    private router: Router,
    private authService: AuthService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.authService.photoURL$.subscribe(photoURL => {
      this.photoURL = photoURL || '';
      this.changeDetectorRef.detectChanges();
    });

    await this.loadUserData();
  }

  async loadUserData(): Promise<void> {
    this.loading = true;

    try {
      const user = await this.authService.waitForAuth();

      if (!user) {
        await this.router.navigate(['/login']);
        return;
      }

      this.username = user.displayName || '';
      this.newUsername = this.username;

      await this.authService.refreshUserData();

      const refreshedUser =
        this.authService.currentUser;

      if (refreshedUser) {
        this.username =
          refreshedUser.displayName || '';

        this.newUsername =
          this.username;
      }
    } catch (error) {
      console.error('ACCOUNT ERROR:', error);
    } finally {
      this.loading = false;
      this.changeDetectorRef.detectChanges();
    }
  }

  async refreshUserData(): Promise<void> {
    if (this.avatarLoading) {
      return;
    }

    this.avatarMessage =
      'Daten werden aktualisiert...';

    this.changeDetectorRef.detectChanges();

    try {
      const result =
        await this.authService.refreshUserData();

      if (result?.user) {
        this.username =
          result.user.displayName || '';

        this.newUsername =
          this.username;
      }

      this.avatarMessage =
        'Daten aktualisiert.';
    } catch (error) {
      console.error(
        'REFRESH USER DATA ERROR:',
        error
      );

      this.avatarMessage =
        'Daten konnten nicht aktualisiert werden.';
    } finally {
      this.changeDetectorRef.detectChanges();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.renderIcons();
    }, 0);
  }

  private renderIcons(): void {
    try {
      createIcons({
        icons: {
          ArrowLeft,
          Camera,
          Trash2,
          RefreshCw,
          PlayingCards,
          LogOut
        }
      });
    } catch (error) {
      console.error(
        'LUCIDE ICON ERROR:',
        error
      );
    }
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  async saveUsername(): Promise<void> {
    const username =
      this.newUsername.trim();

    this.usernameMessage = '';

    if (!username) {
      this.usernameMessage =
        'Bitte einen Namen eingeben.';

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
      await this.authService.changeUsername(
        username
      );

      const user =
        await this.authService.waitForAuth();

      if (user) {
        this.username =
          user.displayName || '';

        this.newUsername =
          this.username;
      }

      this.usernameMessage =
        'Name erfolgreich geändert.';
    } catch (error: any) {
      console.error(
        'CHANGE USERNAME ERROR:',
        error
      );

      switch (error?.code) {
        case 'auth/username-already-in-use':
          this.usernameMessage =
            'Dieser Benutzername ist bereits registriert.';
          break;

        case 'auth/invalid-username':
          this.usernameMessage =
            'Der Benutzername ist ungültig.';
          break;

        default:
          this.usernameMessage =
            'Der Name konnte nicht geändert werden.';
      }
    }

    this.changeDetectorRef.detectChanges();
  }

  async changePassword(): Promise<void> {
    this.passwordMessage = '';

    if (!this.currentPassword) {
      this.passwordMessage =
        'Bitte dein aktuelles Passwort eingeben.';

      this.changeDetectorRef.detectChanges();
      return;
    }

    if (!this.newPassword) {
      this.passwordMessage =
        'Bitte ein neues Passwort eingeben.';

      this.changeDetectorRef.detectChanges();
      return;
    }

    if (this.newPassword.length < 6) {
      this.passwordMessage =
        'Das neue Passwort muss mindestens 6 Zeichen lang sein.';

      this.changeDetectorRef.detectChanges();
      return;
    }

    if (
      this.newPassword !==
      this.confirmPassword
    ) {
      this.passwordMessage =
        'Die Passwörter stimmen nicht überein.';

      this.changeDetectorRef.detectChanges();
      return;
    }

    if (
      this.currentPassword ===
      this.newPassword
    ) {
      this.passwordMessage =
        'Das neue Passwort muss sich vom aktuellen unterscheiden.';

      this.changeDetectorRef.detectChanges();
      return;
    }

    try {
      await this.authService.changePassword(
        this.currentPassword,
        this.newPassword
      );

      this.passwordMessage =
        'Passwort erfolgreich geändert.';

      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
    } catch (error: any) {
      console.error(
        'CHANGE PASSWORD ERROR:',
        error
      );

      switch (error?.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/invalid-password':
          this.passwordMessage =
            'Das aktuelle Passwort ist falsch.';
          break;

        case 'auth/missing-current-password':
          this.passwordMessage =
            'Bitte dein aktuelles Passwort eingeben.';
          break;

        case 'auth/weak-password':
          this.passwordMessage =
            'Das neue Passwort ist zu schwach.';
          break;

        case 'auth/requires-recent-login':
          this.passwordMessage =
            'Bitte melde dich erneut an und versuche es danach noch einmal.';
          break;

        case 'auth/user-not-found':
          this.passwordMessage =
            'Benutzer konnte nicht gefunden werden.';
          break;

        case 'auth/user-disabled':
          this.passwordMessage =
            'Dieser Benutzer wurde deaktiviert.';
          break;

        case 'auth/too-many-requests':
          this.passwordMessage =
            'Zu viele Versuche. Bitte später erneut versuchen.';
          break;

        default:
          this.passwordMessage =
            'Das Passwort konnte nicht geändert werden.';
      }
    } finally {
      this.changeDetectorRef.detectChanges();
    }
  }

  async changeAvatar(): Promise<void> {
    if (
      this.loading ||
      this.avatarLoading
    ) {
      return;
    }

    const input =
      document.createElement('input');

    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async () => {
      const file =
        input.files?.[0];

      if (!file) {
        return;
      }

      await this.uploadAvatar(file);
    };

    input.click();
  }

  @HostListener('paste', ['$event'])
  async pasteAvatar(
    event: ClipboardEvent
  ): Promise<void> {
    if (
      this.loading ||
      this.avatarLoading
    ) {
      return;
    }

    const items =
      event.clipboardData?.items;

    if (!items) {
      return;
    }

    for (const item of Array.from(items)) {
      if (!item.type.startsWith('image/')) {
        continue;
      }

      const file =
        item.getAsFile();

      if (!file) {
        return;
      }

      event.preventDefault();

      await this.uploadAvatar(file);

      return;
    }
  }

  private async uploadAvatar(
    file: File
  ): Promise<void> {
    if (this.avatarLoading) {
      return;
    }

    this.avatarLoading = true;

    this.avatarMessage =
      'Avatar wird gespeichert...';

    this.changeDetectorRef.detectChanges();

    try {
      const photoURL =
        await this.authService.changeAvatarBase64(
          file
        );

      this.photoURL =
        photoURL;

      this.avatarMessage =
        'Avatar erfolgreich geändert.';
    } catch (error: any) {
      console.error(
        'UPLOAD AVATAR ERROR:',
        error
      );

      switch (error?.code) {
        case 'avatar-too-large':
          this.avatarMessage =
            'Das Bild ist zu groß. Bitte wähle ein kleineres Bild.';
          break;

        case 'avatar/invalid-file':
          this.avatarMessage =
            'Bitte wähle eine Bilddatei.';
          break;

        default:
          this.avatarMessage =
            'Der Avatar konnte nicht gespeichert werden.';
      }
    } finally {
      this.avatarLoading = false;
      this.changeDetectorRef.detectChanges();
    }
  }

  async deleteAvatar(): Promise<void> {
    if (
      this.loading ||
      this.avatarLoading
    ) {
      return;
    }

    if (!this.photoURL) {
      this.avatarMessage =
        'Es ist kein Avatar vorhanden.';

      return;
    }

    const confirmed =
      window.confirm(
        'Möchtest du deinen Avatar wirklich löschen?'
      );

    if (!confirmed) {
      return;
    }

    this.avatarLoading = true;

    this.avatarMessage =
      'Avatar wird gelöscht...';

    this.changeDetectorRef.detectChanges();

    try {
      await this.authService.deleteAvatar();

      this.photoURL = '';

      this.avatarMessage =
        'Avatar erfolgreich gelöscht.';
    } catch (error) {
      console.error(
        'DELETE AVATAR ERROR:',
        error
      );

      this.avatarMessage =
        'Der Avatar konnte nicht gelöscht werden.';
    } finally {
      this.avatarLoading = false;
      this.changeDetectorRef.detectChanges();
    }
  }
}