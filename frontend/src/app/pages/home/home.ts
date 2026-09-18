import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { DataService, Topic } from '../../services/data.service';

@Component({
  imports: [RouterLink, CommonModule],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {

  username = '';
  topics: Topic[] = [];
  recentTopics: Topic[] = [];
  accountOpen = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private dataService: DataService
  ) {}

  async ngOnInit() {
    const user = await this.authService.waitForAuth();

    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.username = user.displayName || '';

    await this.loadTopics();
  }

  private async loadTopics() {
    try {
      this.topics = await this.dataService.getTopics();
      this.recentTopics = this.topics.slice(-3).reverse();
    } catch (error) {
      console.error(error);
    }
  }

  toggleAccount() {
    this.accountOpen = !this.accountOpen;
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}