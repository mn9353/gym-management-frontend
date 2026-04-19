import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttendanceService, MemberAttendance } from '../../../core/services/attendance.service';
import { AuthService } from '../../../core/services/auth.service';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';
import { interval, Subscription, startWith, switchMap } from 'rxjs';
import QRCode from 'qrcode';

@Component({
  selector: 'app-owner-attendance',
  standalone: true,
  imports: [CommonModule, TopbarComponent],
  templateUrl: './owner-attendance.component.html',
  styleUrl: './owner-attendance.component.css'
})
export class OwnerAttendanceComponent implements OnInit, OnDestroy {
  private readonly attendanceService = inject(AttendanceService);
  private readonly authService = inject(AuthService);
  
  gymId: string | null = null;
  qrCodeDataUrl: string = '';
  checkins: MemberAttendance[] = [];
  isLoading = true;
  refreshSub?: Subscription;

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.gymId = user?.gymId ?? null;

    if (this.gymId) {
      this.generateQRCode();
      this.startPolling();
    }
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  async generateQRCode(): Promise<void> {
    if (!this.gymId) return;
    
    // The public URL for members to scan
    const origin = window.location.origin;
    const today = new Date().toISOString().split('T')[0]; // Dynamic daily token (e.g., 2026-04-20)
    const scanUrl = `${origin}/attendance/check-in?gymId=${this.gymId}&token=${today}`;
    
    try {
      this.qrCodeDataUrl = await QRCode.toDataURL(scanUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } catch (err) {
      console.error('Error generating QR code', err);
    }
  }

  startPolling(): void {
    if (!this.gymId) return;

    // Refresh attendance list every 30 seconds
    this.refreshSub = interval(30000)
      .pipe(
        startWith(0),
        switchMap(() => this.attendanceService.getTodayAttendance(this.gymId!))
      )
      .subscribe({
        next: (data) => {
          this.checkins = data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching today attendance', err);
          this.isLoading = false;
        }
      });
  }

  printQR(): void {
    const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
    if (!windowPrint) return;

    const user = this.authService.getCurrentUser();
    const gymName = user?.gymName ?? 'Our Gym';

    windowPrint.document.write(`
      <html>
        <head>
          <title>Print QR Code - ${gymName}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; }
            .container { border: 2px solid #000; padding: 40px; border-radius: 20px; display: inline-block; }
            h1 { font-size: 32px; margin-bottom: 10px; }
            p { font-size: 18px; color: #666; margin-bottom: 30px; }
            img { width: 400px; height: 400px; }
            .footer { margin-top: 30px; font-weight: bold; font-size: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${gymName}</h1>
            <p>Scan to Mark Attendance</p>
            <img src="${this.qrCodeDataUrl}" />
            <div class="footer">Welcome to our community!</div>
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    windowPrint.document.close();
  }
}
