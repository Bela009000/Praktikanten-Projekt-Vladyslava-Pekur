import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
  imports: [RouterOutlet, RouterLink, CommonModule]
})
export class App {

  username = '';
  accountOpen = false;

  ngOnInit() {
    const savedUser = localStorage.getItem('currentUser');

    if (savedUser) {
      this.username = savedUser;
    }
  }

  toggleAccount() {
    this.accountOpen = !this.accountOpen;
  }

  logout() {
    localStorage.removeItem('currentUser');
    window.location.href = '/login';
  }
}