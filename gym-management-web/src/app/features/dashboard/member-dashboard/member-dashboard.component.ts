import { AfterViewChecked, Component, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import jsQR from 'jsqr';
import { MemberPortalService } from '../../../core/services/member-portal.service';
import {
  MemberAttendanceSummary,
  MemberCheckinResult,
  MemberMissedTrendPoint,
  MemberMuscleDistribution,
  MemberPortalSummary,
  MemberRestDay,
  MemberWeightPoint
} from '../../../core/models/member-portal.models';
import { ThemeService } from '../../../core/services/theme.service';

export interface CalendarDay {
  date: Date;
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  status: 'PRESENT' | 'ABSENT' | 'REST' | 'FUTURE' | 'UNJOINED';
}

Chart.register(...registerables);

@Component({
  selector: 'app-member-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TopbarComponent],
  templateUrl: './member-dashboard.component.html',
  styleUrl: './member-dashboard.component.css'
})
export class MemberDashboardComponent implements OnInit, AfterViewChecked {
  private readonly destroyRef = inject(DestroyRef);
  private weightChart: Chart<'line'> | null = null;
  private missedChart: Chart<'bar'> | null = null;
  private muscleChart: Chart<'doughnut'> | null = null;
  private chartNeedsRender = false;
  private mediaStream: MediaStream | null = null;
  private scanTimer: ReturnType<typeof setInterval> | null = null;
  private readonly scanCanvas = document.createElement('canvas');
  private readonly scanCtx = this.scanCanvas.getContext('2d', { willReadFrequently: true });

  @ViewChild('weightChartCanvas') weightChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('missedTrendCanvas') missedTrendCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('muscleDistributionCanvas') muscleDistributionCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('scanVideo') scanVideo?: ElementRef<HTMLVideoElement>;

  isLoading = true;
  summary: MemberPortalSummary | null = null;
  weightHistory: MemberWeightPoint[] = [];
  attendance: MemberAttendanceSummary | null = null;
  missedTrend: MemberMissedTrendPoint[] = [];
  muscleDistribution: MemberMuscleDistribution[] = [];
  restDays: MemberRestDay[] = [];
  isSubmittingRestDay = false;

  calendarMonth = new Date();
  calendarWeeks: CalendarDay[][] = [];

  muscleGroups = ['CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'LEGS', 'CORE', 'CARDIO'];
  selectedMuscleGroups = new Set<string>();
  latestCheckin: MemberCheckinResult | null = null;
  showWorkoutPrompt = false;
  qrInput = '';
  isSubmittingMetric = false;
  isSubmittingCheckin = false;
  showScanner = false;
  // Camera scanning is always supported — jsQR works in all browsers
  readonly scanSupported = true;

  readonly metricForm;
  readonly profileForm;

  get isBasicPlan(): boolean {
    const plan = this.authService.getCurrentUser()?.gymSubscriptionPlan ?? '';
    return plan.toLowerCase() === 'basic';
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly memberPortalService: MemberPortalService,
    private readonly notificationService: NotificationService,
    private readonly themeService: ThemeService,
    private readonly authService: AuthService
  ) {
    this.metricForm = this.fb.nonNullable.group({
      metricDate: [new Date().toISOString().slice(0, 10), Validators.required],
      weightKg: [null as number | null, [Validators.min(0)]],
      heightCm: [null as number | null, [Validators.min(0)]],
      targetWeightKg: [null as number | null, [Validators.min(0)]],
      notes: ['']
    });
    this.profileForm = this.fb.nonNullable.group({
      fullName: ['', [Validators.required, Validators.maxLength(100)]],
      email: [''],
      phone: [''],
      gender: [''],
      dateOfBirth: [''],
      emergencyContact: [''],
      fitnessGoal: ['']
    });
  }

  ngOnInit(): void {
    if (this.isBasicPlan) {
      this.loadAttendanceForBasic();
    } else {
      this.loadDashboard();
    }
    this.scanSupported; // always true — jsQR works everywhere
    this.destroyRef.onDestroy(() => this.cleanupScanner());
    this.destroyRef.onDestroy(() => this.destroyCharts());
    this.themeService.theme$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.chartNeedsRender = true;
      });
  }

  ngAfterViewChecked(): void {
    if (!this.chartNeedsRender) {
      return;
    }

    this.renderWeightChart();
    this.renderMissedTrendChart();
    this.renderMuscleDistributionChart();
    this.chartNeedsRender = false;
  }

  loadDashboard(): void {
    this.isLoading = true;
    forkJoin({
      summary: this.memberPortalService.getSummary(),
      weightHistory: this.memberPortalService.getWeightHistory(12),
      attendance: this.memberPortalService.getAttendance(3, 100),
      missedTrend: this.memberPortalService.getMissedTrend(6),
      muscleDistribution: this.memberPortalService.getMuscleDistribution(1),
      restDays: this.memberPortalService.getRestDays(3)
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ summary, weightHistory, attendance, missedTrend, muscleDistribution, restDays }) => {
          this.summary = summary;
          this.weightHistory = weightHistory;
          this.attendance = attendance;
          this.missedTrend = missedTrend;
          this.muscleDistribution = muscleDistribution;
          this.restDays = restDays;
          this.patchMetricForm(summary);
          this.patchProfileForm(summary);
          this.generateCalendar();
          this.chartNeedsRender = true;
          this.isLoading = false;
        },
        error: () => {
          this.notificationService.error('Unable to load member dashboard.');
          this.isLoading = false;
        }
      });
  }

  loadAttendanceForBasic(): void {
    this.isLoading = true;
    forkJoin({
      attendance: this.memberPortalService.getAttendance(3, 100),
      restDays: this.memberPortalService.getRestDays(3)
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ attendance, restDays }) => {
          this.attendance = attendance;
          this.restDays = restDays;
          this.generateCalendar();
          this.isLoading = false;
        },
        error: () => {
          this.notificationService.error('Unable to load attendance.');
          this.isLoading = false;
        }
      });
  }

  submitMetrics(): void {
    if (this.metricForm.invalid || this.isSubmittingMetric) {
      this.metricForm.markAllAsTouched();
      return;
    }

    this.isSubmittingMetric = true;
    const value = this.metricForm.getRawValue();
    this.memberPortalService.updateMetrics({
      metricDate: value.metricDate,
      weightKg: this.parseNullableNumber(value.weightKg),
      heightCm: this.parseNullableNumber(value.heightCm),
      targetWeightKg: this.parseNullableNumber(value.targetWeightKg),
      notes: value.notes?.trim() || null
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => {
          this.summary = summary;
          this.notificationService.success('Metrics updated successfully.');
          this.refreshDashboardData();
          this.isSubmittingMetric = false;
        },
        error: () => {
          this.notificationService.error('Unable to update metrics.');
          this.isSubmittingMetric = false;
        }
      });
  }

  submitProfile(): void {
    if (this.profileForm.invalid || this.isSubmittingMetric) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSubmittingMetric = true;
    const value = this.profileForm.getRawValue();
    this.memberPortalService.updateProfile({
      fullName: (value.fullName || '').trim(),
      email: (value.email || '').trim() || null,
      phone: (value.phone || '').trim() || null,
      gender: (value.gender || '').trim() || null,
      dateOfBirth: (value.dateOfBirth || '').trim() || null,
      emergencyContact: (value.emergencyContact || '').trim() || null,
      fitnessGoal: (value.fitnessGoal || '').trim() || null
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => {
          this.summary = summary;
          this.patchProfileForm(summary);
          this.notificationService.success('Profile updated.');
          this.isSubmittingMetric = false;
        },
        error: (err) => {
          this.notificationService.error(err?.error?.message || 'Unable to update profile.');
          this.isSubmittingMetric = false;
        }
      });
  }

  submitQrCheckin(): void {
    if (this.isSubmittingCheckin) {
      return;
    }
    const rawQr = (this.qrInput || '').trim();
    if (!rawQr) {
      this.notificationService.warning('Please scan or enter the gym QR value.');
      return;
    }

    // Parse owner/trainer QR: URL format is /attendance/check-in?gymId=xxx&token=YYYY-MM-DD
    let qrValue = rawQr;
    try {
      const url = new URL(rawQr);
      const gymId = url.searchParams.get('gymId');
      const token = url.searchParams.get('token');

      if (gymId) {
        // Validate token is today's date (YYYY-MM-DD)
        const today = new Date().toISOString().split('T')[0];
        if (token && token !== today) {
          this.notificationService.error('This QR code has expired. Please ask the gym to refresh it.');
          return;
        }
        qrValue = gymId; // Send just the gymId to the API
      }
    } catch {
      // Not a URL — use raw value as-is (legacy / manual entry)
    }

    this.isSubmittingCheckin = true;
    this.memberPortalService.checkinByQr({ qrValue })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.latestCheckin = result;
          this.qrInput = ''; // Clear input after successful scan
          this.showWorkoutPrompt = !this.isBasicPlan; // Only prompt for workout on full plan
          this.notificationService.success(result.alreadyCheckedIn ? 'Attendance already marked for today.' : 'Attendance marked successfully!');
          if (this.isBasicPlan) {
            this.loadAttendanceForBasic();
          } else {
            this.refreshDashboardData();
          }
          this.isSubmittingCheckin = false;
        },
        error: (err) => {
          this.notificationService.error(err?.error?.message || 'Unable to mark attendance.');
          this.isSubmittingCheckin = false;
        }
      });
  }

  toggleMuscleGroup(group: string): void {
    if (this.selectedMuscleGroups.has(group)) {
      this.selectedMuscleGroups.delete(group);
    } else {
      this.selectedMuscleGroups.add(group);
    }
  }

  submitWorkoutLog(): void {
    if (!this.latestCheckin) {
      return;
    }
    const groups = Array.from(this.selectedMuscleGroups);
    if (groups.length === 0) {
      this.notificationService.warning('Select at least one muscle group.');
      return;
    }

    this.memberPortalService.addWorkout(this.latestCheckin.checkinId, { muscleGroups: groups })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Workout focus saved.');
          this.showWorkoutPrompt = false;
          this.selectedMuscleGroups.clear();
          this.refreshDashboardData();
        },
        error: () => {
          this.notificationService.error('Unable to save workout focus.');
        }
      });
  }

  currentFacingMode: 'user' | 'environment' = 'environment';

  async startScanner(): Promise<void> {
    if (this.showScanner) {
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: this.currentFacingMode } });
      this.showScanner = true;
      setTimeout(() => {
        const video = this.scanVideo?.nativeElement;
        if (video && this.mediaStream) {
          video.srcObject = this.mediaStream;
          video.setAttribute('playsinline', 'true'); // Ensure it works on iOS
          void video.play();
          this.startDetectLoop(video);
        }
      }, 0);
    } catch {
      this.notificationService.error('Camera access was denied. You can paste QR value manually.');
    }
  }

  async toggleCamera(): Promise<void> {
    this.currentFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
    if (this.showScanner) {
      this.cleanupScanner();
      this.showScanner = false;
      await this.startScanner();
    }
  }

  stopScanner(): void {
    this.cleanupScanner();
    this.showScanner = false;
  }

  get goalProgressPercent(): number {
    if (!this.summary?.weight || !this.summary?.targetWeight) {
      return 0;
    }
    const target = Number(this.summary.targetWeight);
    const current = Number(this.summary.weight);
    if (target <= 0 || current <= 0) {
      return 0;
    }
    const ratio = Math.min(1, target / Math.max(current, target));
    return Math.round(ratio * 100);
  }

  get shouldShowExpiryBanner(): boolean {
    if (!this.summary) {
      return false;
    }
    return this.summary.daysUntilPlanEnd <= 10;
  }

  private startDetectLoop(video: HTMLVideoElement): void {
    const BarcodeDetectorCtor = (window as { BarcodeDetector?: new (args?: { formats?: string[] }) => { detect: (input: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector;

    if (BarcodeDetectorCtor) {
      // Use native BarcodeDetector (Android Chrome, some desktop Chromium builds)
      const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
      this.scanTimer = setInterval(async () => {
        if (!video.videoWidth || !video.videoHeight) return;
        try {
          const result = await detector.detect(video);
          const qrValue = result?.[0]?.rawValue?.trim();
          if (qrValue) {
            this.qrInput = qrValue;
            this.stopScanner();
            this.submitQrCheckin();
          }
        } catch { /* no-op */ }
      }, 700);
    } else {
      // Universal fallback: jsQR via canvas frame capture (works on all browsers)
      this.scanTimer = setInterval(() => {
        if (!video.videoWidth || !video.videoHeight) return;
        try {
          this.scanCanvas.width = video.videoWidth;
          this.scanCanvas.height = video.videoHeight;
          this.scanCtx!.drawImage(video, 0, 0);
          const imageData = this.scanCtx!.getImageData(0, 0, this.scanCanvas.width, this.scanCanvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
          if (code?.data) {
            this.qrInput = code.data;
            this.stopScanner();
            this.submitQrCheckin();
          }
        } catch { /* no-op */ }
      }, 500);
    }
  }

  private cleanupScanner(): void {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  private refreshDashboardData(): void {
    if (this.isBasicPlan) {
      this.loadAttendanceForBasic();
      return;
    }

    forkJoin({
      summary: this.memberPortalService.getSummary(),
      weightHistory: this.memberPortalService.getWeightHistory(12),
      attendance: this.memberPortalService.getAttendance(3, 100),
      missedTrend: this.memberPortalService.getMissedTrend(6),
      muscleDistribution: this.memberPortalService.getMuscleDistribution(1),
      restDays: this.memberPortalService.getRestDays(3)
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ summary, weightHistory, attendance, missedTrend, muscleDistribution, restDays }) => {
          this.summary = summary;
          this.weightHistory = weightHistory;
          this.attendance = attendance;
          this.missedTrend = missedTrend;
          this.muscleDistribution = muscleDistribution;
          this.restDays = restDays;
          this.generateCalendar();
          this.chartNeedsRender = true;
        }
      });
  }

  toggleRestDayFromCalendar(day: CalendarDay): void {
    if (this.isSubmittingRestDay || day.status === 'FUTURE' || day.status === 'UNJOINED' || day.status === 'PRESENT') {
      return;
    }

    if (day.status === 'REST') {
      const restDay = this.restDays.find((r) => r.restDate === day.dateStr);
      if (restDay) {
        if (!confirm('Are you sure you want to remove this rest day?')) return;
        this.memberPortalService.deleteRestDay(restDay.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.notificationService.success('Rest day removed.');
              this.refreshDashboardData();
            },
            error: (err) => {
              this.notificationService.error(err?.error?.message || 'Unable to remove rest day.');
            }
          });
      }
    } else if (day.status === 'ABSENT') {
      this.isSubmittingRestDay = true;
      this.memberPortalService.addRestDay({
        restDate: day.dateStr,
        notes: null
      }).pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.notificationService.success('Rest day saved.');
            this.refreshDashboardData();
            this.isSubmittingRestDay = false;
          },
          error: (err) => {
            this.notificationService.error(err?.error?.message || 'Unable to save rest day.');
            this.isSubmittingRestDay = false;
          }
        });
    }
  }

  private patchMetricForm(summary: MemberPortalSummary): void {
    this.metricForm.patchValue({
      metricDate: new Date().toISOString().slice(0, 10),
      weightKg: summary.weight ?? null,
      heightCm: summary.height ?? null,
      targetWeightKg: summary.targetWeight ?? null
    }, { emitEvent: false });
  }

  private patchProfileForm(summary: MemberPortalSummary): void {
    this.profileForm.patchValue({
      fullName: summary.fullName ?? '',
      email: summary.email ?? '',
      phone: summary.phone ?? '',
      gender: summary.gender ?? '',
      dateOfBirth: summary.dateOfBirth ?? '',
      emergencyContact: summary.emergencyContact ?? '',
      fitnessGoal: summary.fitnessGoal ?? ''
    }, { emitEvent: false });
  }

  private parseNullableNumber(value: number | null): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private renderWeightChart(): void {
    if (!this.weightChartCanvas?.nativeElement) {
      return;
    }

    if (this.weightChart) {
      this.weightChart.destroy();
      this.weightChart = null;
    }

    this.weightChart = new Chart(this.weightChartCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: this.weightHistory.map((p) => new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })),
        datasets: [
          {
            label: 'Weight (kg)',
            data: this.weightHistory.map((p) => Number(p.weightKg)),
            borderColor: this.getCssVar('--brand'),
            backgroundColor: this.alphaColor(this.getCssVar('--brand'), 0.12),
            fill: true,
            tension: 0.25,
            pointRadius: 3
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, labels: { color: this.getCssVar('--text') } }
        },
        scales: {
          x: { grid: { color: this.alphaColor(this.getCssVar('--line'), 0.45) }, ticks: { color: this.getCssVar('--text-dim') } },
          y: { beginAtZero: false, grid: { color: this.alphaColor(this.getCssVar('--line'), 0.45) }, ticks: { color: this.getCssVar('--text-dim') } }
        }
      }
    });
  }

  private renderMissedTrendChart(): void {
    if (!this.missedTrendCanvas?.nativeElement) {
      return;
    }
    if (this.missedChart) {
      this.missedChart.destroy();
      this.missedChart = null;
    }

    this.missedChart = new Chart(this.missedTrendCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: this.missedTrend.map((x) => x.label),
        datasets: [
          {
            label: 'Attended',
            data: this.missedTrend.map((x) => x.attendedDays),
            backgroundColor: '#16a34a',
            borderRadius: 8
          },
          {
            label: 'Missed',
            data: this.missedTrend.map((x) => x.missedDays),
            backgroundColor: '#dc2626',
            borderRadius: 8
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: this.getCssVar('--text') } }
        },
        scales: {
          x: { stacked: true, ticks: { color: this.getCssVar('--text-dim') }, grid: { color: this.alphaColor(this.getCssVar('--line'), 0.45) } },
          y: { stacked: true, beginAtZero: true, ticks: { color: this.getCssVar('--text-dim') }, grid: { color: this.alphaColor(this.getCssVar('--line'), 0.45) } }
        }
      }
    });
  }

  private renderMuscleDistributionChart(): void {
    if (!this.muscleDistributionCanvas?.nativeElement) {
      return;
    }
    if (this.muscleChart) {
      this.muscleChart.destroy();
      this.muscleChart = null;
    }

    this.muscleChart = new Chart(this.muscleDistributionCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.muscleDistribution.map((x) => x.muscleGroup),
        datasets: [
          {
            label: 'Sessions',
            data: this.muscleDistribution.map((x) => x.sessionCount),
            backgroundColor: ['#2563eb', '#06b6d4', '#f59e0b', '#16a34a', '#a855f7', '#ef4444', '#14b8a6', '#4f46e5']
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: this.getCssVar('--text') } }
        }
      }
    });
  }

  changeCalendarMonth(offset: number): void {
    this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() + offset, 1);
    this.generateCalendar();
  }

  private generateCalendar(): void {
    if (!this.summary && !this.isBasicPlan) { return; }

    const year = this.calendarMonth.getFullYear();
    const month = this.calendarMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const endDate = new Date(lastDayOfMonth);
    if (endDate.getDay() !== 6) {
      endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    }

    const joinDateStr = this.summary?.joinDate;
    const joinDate = joinDateStr ? new Date(joinDateStr) : new Date(0);
    const joinDateMidnight = new Date(joinDate.setHours(0, 0, 0, 0));

    const checkinSet = new Set(this.attendance?.recent.map((r) => r.checkinDate) || []);
    const restSet = new Set(this.restDays.map((r) => r.restDate));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weeks: CalendarDay[][] = [];
    let currentGroup: CalendarDay[] = [];

    const d = new Date(startDate);
    while (d <= endDate) {
      const utcYear = d.getFullYear();
      const utcMonth = String(d.getMonth() + 1).padStart(2, '0');
      const utcDay = String(d.getDate()).padStart(2, '0');
      const dStr = `${utcYear}-${utcMonth}-${utcDay}`;
      
      const isCurrentMonth = d.getMonth() === month;
      const isFuture = d.getTime() > today.getTime();
      const isBeforeJoin = d.getTime() < joinDateMidnight.getTime();

      let status: CalendarDay['status'] = 'ABSENT';
      if (isFuture) status = 'FUTURE';
      else if (isBeforeJoin) status = 'UNJOINED';
      else if (checkinSet.has(dStr)) status = 'PRESENT';
      else if (restSet.has(dStr)) status = 'REST';

      currentGroup.push({
        date: new Date(d),
        dateStr: dStr,
        dayNumber: d.getDate(),
        isCurrentMonth,
        isToday: d.getTime() === today.getTime(),
        status
      });

      if (currentGroup.length === 7) {
        weeks.push(currentGroup);
        currentGroup = [];
      }
      d.setDate(d.getDate() + 1);
    }
    this.calendarWeeks = weeks;
  }

  private destroyCharts(): void {
    if (this.weightChart) {
      this.weightChart.destroy();
      this.weightChart = null;
    }
    if (this.missedChart) {
      this.missedChart.destroy();
      this.missedChart = null;
    }
    if (this.muscleChart) {
      this.muscleChart.destroy();
      this.muscleChart = null;
    }
  }

  private getCssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#122033';
  }

  private alphaColor(hexOrRgb: string, alpha: number): string {
    if (hexOrRgb.startsWith('#')) {
      const hex = hexOrRgb.replace('#', '');
      const normalized = hex.length === 3 ? hex.split('').map((x) => x + x).join('') : hex;
      const r = parseInt(normalized.slice(0, 2), 16);
      const g = parseInt(normalized.slice(2, 4), 16);
      const b = parseInt(normalized.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return hexOrRgb;
  }
}
