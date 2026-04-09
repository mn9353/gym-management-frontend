import { environment } from '../../../environments/environment';

export function buildApiUrl(basePath: string, path = ''): string {
  return `${environment.apiBaseUrl}${basePath}${path}`;
}
