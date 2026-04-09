import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MemberService } from '../../../core/services/member.service';
import { MemberDto } from '../../../core/models/member.models';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';

@Component({
  selector: 'app-owner-members',
  standalone: true,
  imports: [CommonModule, TopbarComponent],
  templateUrl: './owner-members.component.html',
  styleUrl: './owner-members.component.css'
})
export class OwnerMembersComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  members: MemberDto[] = [];
  statusFilter: 'ACTIVE' | 'EXPIRED' = 'ACTIVE';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly memberService: MemberService
  ) {}

  ngOnInit(): void {
    const rawStatus = (this.route.snapshot.paramMap.get('status') || 'active').toUpperCase();
    this.statusFilter = rawStatus === 'EXPIRED' ? 'EXPIRED' : 'ACTIVE';

    this.memberService
      .searchMembers({
        status: this.statusFilter,
        pageNumber: 1,
        pageSize: 100
      })
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
}
