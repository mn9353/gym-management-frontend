import { HttpContextToken } from '@angular/common/http';

export const FORCE_GLOBAL_LOADER = new HttpContextToken<boolean>(() => false);
export const SKIP_GLOBAL_LOADER = new HttpContextToken<boolean>(() => false);
