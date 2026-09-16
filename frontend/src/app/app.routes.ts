import { Routes } from '@angular/router';

import { Register } from './pages/register/register';
import { Login } from './pages/login/login';
import { Home } from './pages/home/home';
import { Topics } from './pages/topics/topics';
import { Topic } from './pages/topic/topic';
import { Cards } from './pages/cards/cards';

import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'register', component: Register },
  { path: 'login', component: Login },
  { path: 'home', component: Home, canActivate: [authGuard] },

  { path: 'topics', component: Topics, canActivate: [authGuard] },

  { path: 'topic/:id', component: Topic, canActivate: [authGuard] },

  { path: 'cards/:id', component: Cards, canActivate: [authGuard] }
];