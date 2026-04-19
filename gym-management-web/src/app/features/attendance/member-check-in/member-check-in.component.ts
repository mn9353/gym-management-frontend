import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AttendanceService, AttendanceResult } from '../../../core/services/attendance.service';

@Component({
  selector: 'app-member-check-in',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './member-check-in.component.html',
  styleUrl: './member-check-in.component.css'
})
export class MemberCheckInComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly attendanceService = inject(AttendanceService);

  gymId: string | null = null;
  identifier: string = '';
  isLoading = false;
  result: AttendanceResult | null = null;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.gymId = this.route.snapshot.queryParamMap.get('gymId');
    if (!this.gymId) {
      this.errorMessage = 'Invalid QR Code. Please ask the gym owner for the correct one.';
    }
  }

  onSubmit(): void {
    if (!this.gymId || !this.identifier.trim()) return;

    this.isLoading = true;
    this.result = null;
    this.errorMessage = null;

    this.attendanceService.markAttendance({
      gymId: this.gymId,
      identifier: this.identifier.trim()
    }).subscribe({
      next: (res) => {
        this.result = res;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Check-in failed. Please try again.';
        this.isLoading = false;
      }
    });
  }

  reset(): void {
    this.result = null;
    this.errorMessage = null;
    this.identifier = '';
  }
}
