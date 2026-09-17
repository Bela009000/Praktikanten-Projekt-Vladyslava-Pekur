import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const currentUser = localStorage.getItem('currentUser');

  if (!currentUser || currentUser.trim() === '') {
    return router.createUrlTree(['/login']);
  }

  return true;
};