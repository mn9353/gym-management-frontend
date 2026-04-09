export interface HealthResponse {
  status: string;
  timestamp: string;
}

export interface DbDiagnosticsResponse {
  success: boolean;
  message: string;
  timestamp: string;
  stats?: {
    usersCount: number;
    gymsCount: number;
    membersCount: number;
    refreshTokensCount: number;
  };
  errorType?: string;
}

export interface DbDebugError {
  type?: string | null;
  message?: string | null;
  innerType?: string | null;
  innerMessage?: string | null;
  sqlState?: string | null;
  severity?: string | null;
}

export interface DbDebugResponse {
  success: boolean;
  message: string;
  timestamp: string;
  result?: string;
  error?: DbDebugError;
}
