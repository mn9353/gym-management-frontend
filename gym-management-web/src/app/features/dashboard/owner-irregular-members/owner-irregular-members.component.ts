import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';
import { DashboardService } from '../../../core/services/dashboard.service';
import { IrregularMember, PaginatedIrregularMembers } from '../../../core/models/dashboard.models';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-owner-irregular-members',
  standalone: true,
  imports: [CommonModule, TopbarComponent],
  templateUrl: './owner-irregular-members.component.html',
  styleUrl: './owner-irregular-members.component.css'
})
export class OwnerIrregularMembersComponent implements OnInit {
  isLoading = true;
  isLoadingMore = false;
  members: IrregularMember[] = [];
  errorMessage = '';
  
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  hasMoreItems = false;

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadMembers();
  }

  loadMembers(page = 1, append = false): void {
    if (append) {
      this.isLoadingMore = true;
    } else {
      this.isLoading = true;
    }
    
    this.errorMessage = '';
    this.dashboardService.getIrregularMembers(page, this.pageSize, 4).subscribe({
      next: (response) => {
        if (append) {
          this.members = [...this.members, ...response.items];
        } else {
          this.members = response.items;
        }
        
        this.totalCount = response.totalCount;
        this.currentPage = response.pageNumber;
        this.hasMoreItems = this.members.length < this.totalCount;
        
        this.isLoading = false;
        this.isLoadingMore = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.isLoadingMore = false;
        this.errorMessage = 'Unable to load irregular members.';
        console.error(err);
      }
    });
  }

  loadMore(): void {
    if (!this.isLoadingMore && this.hasMoreItems) {
      this.loadMembers(this.currentPage + 1, true);
    }
  }

  contactWhatsApp(member: IrregularMember): void {
    if (!member.phone) return;
    const message = `Hey ${member.fullName}, we missed you at the gym! Hope everything is fine. See you soon!`;
    const url = `https://wa.me/${member.phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  contactCall(member: IrregularMember): void {
    if (!member.phone) return;
    window.location.href = `tel:${member.phone}`;
  }
}
