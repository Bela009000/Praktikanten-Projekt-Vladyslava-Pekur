import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  imports: [FormsModule, RouterLink, CommonModule],
  selector: 'app-register',
  styleUrl: './register.css',
  templateUrl: './register.html',
})
export class Register {
  username = '';
  password = '';
  message = '';
  isSuccess = false;
  showPassword = false;

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.password.length < 6) {
      this.message = 'Das Passwort muss mindestens 6 Zeichen lang sein.';
      this.isSuccess = false;
      return;
    }

    const hasUpperCase = /[A-Z]/.test(this.password);
    if (!hasUpperCase) {
      this.message = 'Das Passwort muss mindestens einen Großbuchstaben enthalten.';
      this.isSuccess = false;
      return;
    }

    const hasNumber = /[0-9]/.test(this.password);
    if (!hasNumber) {
      this.message = 'Das Passwort muss mindestens eine Zahl enthalten.';
      this.isSuccess = false;
      return;
    }
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-[\]\\\/]/.test(this.password);    if (!hasSpecialChar) {
      this.message = 'Das Passwort muss mindestens ein Sonderzeichen enthalten (z. B. ! @ # $).';
      this.isSuccess = false;
      return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');

    const usernameExists = users.some((u: any) => u.username === this.username);
    if (usernameExists) {
      this.message = 'Dieser Benutzername ist bereits vergeben.';
      this.isSuccess = false;
      return;
    }

    users.push({
      username: this.username,
      password: this.password,
    });

    localStorage.setItem('users', JSON.stringify(users));

    this.message = 'Registrierung erfolgreich!';
    this.isSuccess = true;
  }
}