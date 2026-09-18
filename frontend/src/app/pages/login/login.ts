import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  imports: [FormsModule, RouterLink, CommonModule],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  loginInput = '';
  password = '';
  message = '';
  isSuccess = false;
  showPassword = false;

  constructor(private authService: AuthService, private router: Router) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    try {
      await this.authService.login(this.loginInput, this.password);
      this.router.navigate(['/home']);
    } catch (error: any) {
      this.isSuccess = false;
      this.message = 'Benutzername/E-Mail oder Passwort ist falsch.';
    }
  }
}