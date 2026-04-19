import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Input } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

type MenuItem = {
  label: string;
  path: string;
  exact?: boolean;
};

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css'
})
export class TopbarComponent {
  @Input() title = '';
  @Input() subtitle = '';
  isMenuOpen = false;
  isUserMenuOpen = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly themeService: ThemeService
  ) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.isMenuOpen = false;
        this.isUserMenuOpen = false;
      });
  }

  get userName(): string {
    return this.authService.getCurrentUser()?.fullName ?? 'User';
  }

  get userInitials(): string {
    const parts = this.userName
      .split(' ')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    if (parts.length === 0) {
      return 'U';
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 1).toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  get userRole(): string {
    return this.authService.getCurrentUser()?.role ?? '';
  }

  get gymSubscriptionPlan(): string {
    return (this.authService.getCurrentUser()?.gymSubscriptionPlan ?? '').toLowerCase();
  }

  get isBasicPlan(): boolean {
    return this.gymSubscriptionPlan === 'basic';
  }

  get gymName(): string {
    return this.authService.getCurrentUser()?.gymName || 'Gym Management';
  }

  get gymShortName(): string {
    const words = this.gymName
      .split(' ')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    if (words.length === 0) {
      return 'GYM';
    }

    if (words.length === 1) {
      return words[0].slice(0, 3).toUpperCase();
    }

    return words
      .slice(0, 3)
      .map((part) => part[0].toUpperCase())
      .join('');
  }

  get menuItems(): MenuItem[] {
    if (this.userRole === 'ADMIN') {
      return [{ label: 'Dashboard', path: '/admin/dashboard', exact: true }];
    }

    if (this.userRole === 'TRAINER') {
      return [
        { label: 'Dashboard', path: '/trainer/dashboard', exact: true },
        { label: 'Members', path: '/trainer/members', exact: true },
        { label: 'Add Member', path: '/trainer/members/add', exact: true },
        { label: 'Enquiries', path: '/trainer/enquiries', exact: true }
      ];
    }

    if (this.userRole === 'MEMBER') {
      return [{ label: 'Dashboard', path: '/member/dashboard', exact: true }];
    }

    return [
      { label: 'Dashboard', path: '/owner/dashboard', exact: true },
      { label: 'Members', path: '/owner/members', exact: true },
      { label: 'Add Member', path: '/owner/members/add', exact: true },
      ...(this.isBasicPlan ? [] : [{ label: 'Transactions', path: '/owner/transactions', exact: true }]),
      { label: 'Team', path: '/owner/team', exact: true },
      { label: 'Enquiries', path: '/owner/enquiries', exact: true }
    ];
  }

  get isDarkTheme(): boolean {
    return this.themeService.isDark();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen) {
      this.isUserMenuOpen = false;
    }
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    if (this.isUserMenuOpen) {
      this.isMenuOpen = false;
    }
  }

  closeMenus(): void {
    this.isMenuOpen = false;
    this.isUserMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (target && !this.elementRef.nativeElement.contains(target)) {
      this.isMenuOpen = false;
      this.isUserMenuOpen = false;
    }
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => {
        this.authService.forceLogout();
        this.router.navigate(['/login']);
      }
    });
  }
}
