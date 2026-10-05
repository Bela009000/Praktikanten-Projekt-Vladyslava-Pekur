import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  isDarkMode = false;

  constructor() {
    const saved = localStorage.getItem('darkMode');
    this.isDarkMode = saved === 'true';
    this.applyTheme();
  }

  toggle() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('darkMode', String(this.isDarkMode));
    this.applyTheme();
  }

  private applyTheme() {
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }
}