import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import {
  createIcons,
  Eye,
  EyeOff
} from 'lucide';

@Component({
  imports: [FormsModule, RouterLink, CommonModule],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {

  username = '';
  password = '';

  message = '';
  isSuccess = false;

  showPassword = false;

  constructor(private router: Router) {}

  ngOnInit() {
    this.updateIcons();
  }

  togglePassword() {
    this.showPassword = !this.showPassword;

    setTimeout(() => {
      this.updateIcons();
    });
  }

  private updateIcons() {
    createIcons({
      icons: {
        Eye,
        EyeOff
      }
    });
  }

  onSubmit() {

    const users = JSON.parse(
      localStorage.getItem('users') || '[]'
    );

    const user = users.find(
      (u: any) => u.username === this.username
    );

    if (!user || user.password !== this.password) {

      this.message =
        'Benutzername oder Passwort ist falsch.';

      this.isSuccess = false;

      return;
    }

    localStorage.setItem(
      'currentUser',
      this.username
    );

    this.router.navigate(['/home']);
  }
}