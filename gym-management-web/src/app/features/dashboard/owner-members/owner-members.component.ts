import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MemberService } from '../../../core/services/member.service';
import { MemberDto } from '../../../core/models/member.models';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-owner-members',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TopbarComponent],
  templateUrl: './owner-members.component.html',
  styleUrl: './owner-members.component.css'
})
export class OwnerMembersComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  isLoading = true;
  errorMessage = '';
  members: MemberDto[] = [];
  statusFilter: 'ACTIVE' | 'EXPIRED' = 'ACTIVE';
  readonly tableSkeletons = Array.from({ length: 6 }, (_, index) => index);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly memberService: MemberService
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const rawStatus = (params.get('status') || 'active').toUpperCase();
          this.statusFilter = rawStatus === 'EXPIRED' ? 'EXPIRED' : 'ACTIVE';
          this.isLoading = true;
          this.errorMessage = '';

          return this.memberService.searchMembers({
            status: this.statusFilter,
            pageNumber: 1,
            pageSize: 100
          });
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (members) => {
          this.members = members;
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Unable to load members.';
          this.isLoading = false;
        }
      });
  }

  get pageTitle(): string {
    return this.statusFilter === 'ACTIVE' ? 'Active Members' : 'Lapsed Members';
  }

  get pageSubtitle(): string {
    return this.statusFilter === 'ACTIVE'
      ? 'Members with currently valid plans.'
      : 'Members whose plan end date has passed.';
  }

  displayStatus(status: string): string {
    if (status === 'EXPIRED') {
      return 'Lapsed';
    }
    if (status === 'ACTIVE') {
      return 'Active';
    }
    return status;
  }
}
