import { AfterViewChecked, Component, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
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
  restDayDate = new Date().toISOString().slice(0, 10);
  restDayNotes = '';
  isSubmittingRestDay = false;

  muscleGroups = ['CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'LEGS', 'CORE', 'CARDIO'];
  selectedMuscleGroups = new Set<string>();
  latestCheckin: MemberCheckinResult | null = null;
  showWorkoutPrompt = false;
  qrInput = '';
  isSubmittingMetric = false;
  isSubmittingCheckin = false;
  showScanner = false;
  scanSupported = false;

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
    this.scanSupported = typeof (window as { BarcodeDetector?: unknown }).BarcodeDetector !== 'undefined';
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
      attendance: this.memberPortalService.getAttendance(3, 45),
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
    this.memberPortalService.getAttendance(3, 45)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (attendance) => {
          this.attendance = attendance;
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

  async startScanner(): Promise<void> {
    if (!this.scanSupported || this.showScanner) {
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      this.showScanner = true;
      setTimeout(() => {
        const video = this.scanVideo?.nativeElement;
        if (video && this.mediaStream) {
          video.srcObject = this.mediaStream;
          void video.play();
          this.startDetectLoop(video);
        }
      }, 0);
    } catch {
      this.notificationService.error('Camera access was denied. You can paste QR value manually.');
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
    if (!BarcodeDetectorCtor) {
      return;
    }

    const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
    this.scanTimer = setInterval(async () => {
      if (!video.videoWidth || !video.videoHeight) {
        return;
      }

      try {
        const result = await detector.detect(video);
        const qrValue = result?.[0]?.rawValue?.trim();
        if (qrValue) {
          this.qrInput = qrValue;
          this.stopScanner();
          this.submitQrCheckin();
        }
      } catch {
        // no-op
      }
    }, 700);
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
    forkJoin({
      summary: this.memberPortalService.getSummary(),
      weightHistory: this.memberPortalService.getWeightHistory(12),
      attendance: this.memberPortalService.getAttendance(3, 45),
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
          this.chartNeedsRender = true;
        }
      });
  }

  submitRestDay(): void {
    if (this.isSubmittingRestDay) {
      return;
    }
    const date = (this.restDayDate || '').trim();
    if (!date) {
      this.notificationService.warning('Please choose a rest-day date.');
      return;
    }

    this.isSubmittingRestDay = true;
    this.memberPortalService.addRestDay({
      restDate: date,
      notes: this.restDayNotes?.trim() || null
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Rest day saved.');
          this.restDayNotes = '';
          this.refreshDashboardData();
          this.isSubmittingRestDay = false;
        },
        error: (err) => {
          this.notificationService.error(err?.error?.message || 'Unable to save rest day.');
          this.isSubmittingRestDay = false;
        }
      });
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
