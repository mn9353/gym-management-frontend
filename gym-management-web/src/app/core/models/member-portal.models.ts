export interface MemberPortalSummary {
  memberId: string;
  gymId: string;
  gymName: string;
  gymEmail?: string | null;
  gymPhone?: string | null;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  height?: number | null;
  weight?: number | null;
  targetWeight?: number | null;
  emergencyContact?: string | null;
  fitnessGoal?: string | null;
  lastWeightUpdateDate?: string | null;
  joinDate: string;
  planEndDate: string;
  daysUntilPlanEnd: number;
  checkedInToday: boolean;
  attendanceThisMonth: number;
  attendanceLast30Days: number;
  restDaysLast30Days: number;
  missedDaysLast30Days: number;
  currentStreakDays: number;
  bestStreakDays: number;
}

export interface MemberWeightPoint {
  date: string;
  weightKg: number;
}

export interface MemberAttendanceItem {
  checkinId: string;
  checkinDate: string;
  checkinAt: string;
  source: string;
  muscleGroups: string[];
}

export interface MemberAttendanceSummary {
  totalCheckins: number;
  recent: MemberAttendanceItem[];
}

export interface MemberMissedTrendPoint {
  label: string;
  attendedDays: number;
  missedDays: number;
}

export interface MemberMuscleDistribution {
  muscleGroup: string;
  sessionCount: number;
}

export interface MemberMetricUpdateRequest {
  metricDate: string;
  weightKg?: number | null;
  heightCm?: number | null;
  targetWeightKg?: number | null;
  notes?: string | null;
}

export interface MemberCheckinScanRequest {
  qrValue: string;
  muscleGroups?: string[];
  notes?: string | null;
}

export interface MemberWorkoutLogRequest {
  muscleGroups: string[];
  notes?: string | null;
}

export interface MemberCheckinResult {
  checkinId: string;
  checkinDate: string;
  checkinAt: string;
  alreadyCheckedIn: boolean;
  workoutLogged: boolean;
}

export interface MemberRestDayRequest {
  restDate: string;
  notes?: string | null;
}

export interface MemberRestDay {
  id: string;
  restDate: string;
  notes?: string | null;
}

export interface MemberProfileUpdateRequest {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  emergencyContact?: string | null;
  fitnessGoal?: string | null;
}
