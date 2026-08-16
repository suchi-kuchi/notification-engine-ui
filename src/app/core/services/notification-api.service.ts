// src/app/core/services/notification-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NotificationPayload } from './signalr.service';

@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://localhost:7182/api/Notifications';

  // Fetch existing unread & recent notifications from DB on page load
  getUnreadNotifications(userId: string): Observable<NotificationPayload[]> {
    return this.http.get<NotificationPayload[]>(`${this.baseUrl}/user/${userId}/unread`);
  }

  // Persist "Mark as Read" state to SQL Server DB
  markAsRead(notificationId: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${notificationId}/read`, {});
  }

  // Bulk dismissal in DB
  markAllAsRead(userId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/user/${userId}/read-all`, {});
  }
}
