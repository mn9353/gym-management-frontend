import { environment } from '../../../environments/environment';

export function buildApiUrl(basePath: string, path = ''): string {
  const base = environment.apiBaseUrl.endsWith('/') ? environment.apiBaseUrl : `${environment.apiBaseUrl}/`;
  const normalizedBasePath = basePath.startsWith('/') ? basePath.substring(1) : basePath;
  const joinedBase = `${base}${normalizedBasePath}`;
  
  if (!path) return joinedBase;
  
  const finalJoinedBase = joinedBase.endsWith('/') ? joinedBase : `${joinedBase}/`;
  const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
  
  return `${finalJoinedBase}${normalizedPath}`;
}
