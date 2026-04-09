import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppUserDto, CreateGymDto, CreateUserDto, GymDto, OwnerCreateUserDto, UpdateGymDto, UpdateUserDto } from '../models/admin.models';
import { API_PATHS } from '../constants/api-paths';
import { buildApiUrl } from '../constants/api-url';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private readonly http: HttpClient) {}

  getGyms(): Observable<GymDto[]> {
    return this.http.get<GymDto[]>(buildApiUrl(API_PATHS.gyms.base));
  }

  createGym(payload: CreateGymDto): Observable<GymDto> {
    return this.http.post<GymDto>(buildApiUrl(API_PATHS.gyms.base), payload);
  }

  updateGym(gymId: string, payload: UpdateGymDto): Observable<GymDto> {
    return this.http.put<GymDto>(buildApiUrl(API_PATHS.gyms.base, `/${gymId}`), payload);
  }

  getUsers(gymId?: string): Observable<AppUserDto[]> {
    let params = new HttpParams();
    if (gymId) {
      params = params.set('gymId', gymId);
    }
    return this.http.get<AppUserDto[]>(buildApiUrl(API_PATHS.users.base), { params });
  }

  createUser(payload: CreateUserDto): Observable<AppUserDto> {
    return this.http.post<AppUserDto>(buildApiUrl(API_PATHS.users.base), payload);
  }

  createOwnerUser(payload: OwnerCreateUserDto): Observable<AppUserDto> {
    return this.http.post<AppUserDto>(buildApiUrl(API_PATHS.users.base, API_PATHS.users.ownerCreate), payload);
  }

  updateUser(userId: string, payload: UpdateUserDto): Observable<AppUserDto> {
    return this.http.put<AppUserDto>(buildApiUrl(API_PATHS.users.base, `/${userId}`), payload);
  }
}
