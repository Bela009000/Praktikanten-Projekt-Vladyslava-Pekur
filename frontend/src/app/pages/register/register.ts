import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  imports: [FormsModule, RouterLink, CommonModule],
  selector: 'app-register',
  styleUrl: './register.css',
  templateUrl: './register.html',
})
export class Register {
  username = '';
  email = '';
  password = '';
  message = '';
  isSuccess = false;
  isLoading = false;
  showPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    if (this.isLoading) {
      return;
    }

    if (this.username.includes('@')) {
      this.message = 'Der Benutzername darf kein @-Zeichen enthalten.';
      this.isSuccess = false;
      return;
    }

    if (this.password.length < 6) {
      this.message = 'Das Passwort muss mindestens 6 Zeichen lang sein.';
      this.isSuccess = false;
      return;
    }

    if (!/[A-Z]/.test(this.password)) {
      this.message = 'Das Passwort muss mindestens einen Großbuchstaben enthalten.';
      this.isSuccess = false;
      return;
    }

    if (!/[0-9]/.test(this.password)) {
      this.message = 'Das Passwort muss mindestens eine Zahl enthalten.';
      this.isSuccess = false;
      return;
    }

    if (!/[!@#$%^&*(),_.?":{}|<>]/.test(this.password)) {
      this.message = 'Das Passwort muss mindestens ein Sonderzeichen enthalten (z. B. ! @ # $).';
      this.isSuccess = false;
      return;
    }

    this.isLoading = true;
    this.message = '';
    this.changeDetectorRef.detectChanges();

    try {
      await this.authService.register(
        this.username,
        this.email,
        this.password
      );

      await this.authService.logout();

      this.message = 'Erfolgreich registriert! Du wirst zum Login weitergeleitet...';
      this.isSuccess = true;
      this.changeDetectorRef.detectChanges();

      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 1500);

    } catch (error: any) {
      this.isSuccess = false;

      if (error.code === 'auth/username-already-in-use') {
        this.message = 'Dieser Benutzername ist bereits registriert.';
      } else if (error.code === 'auth/email-already-in-use') {
        this.message = 'Diese E-Mail ist bereits registriert.';
      } else if (error.code === 'auth/invalid-email') {
        this.message = 'Ungültige E-Mail-Adresse.';
      } else {
        this.message = 'Registrierung fehlgeschlagen. Bitte versuche es erneut.';
      }
    } finally {
      this.isLoading = false;
      this.changeDetectorRef.detectChanges();
    }
  }
}