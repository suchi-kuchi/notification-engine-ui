// src/app/core/services/signalr.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';

export interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  priority: number; // 1: Low, 2: Medium, 3: High/Critical
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class SignalrService {
  private hubConnection!: signalR.HubConnection;

  // Primary Reactive Signals State
  private readonly _notifications = signal<NotificationPayload[]>([]);
  readonly notifications = this._notifications.asReadonly();

  readonly unreadCount = computed(() => this._notifications().length);
  readonly criticalCount = computed(
    () => this._notifications().filter((n) => n.priority >= 3).length,
  );

  private readonly _connectionState = signal<'Connected' | 'Reconnecting' | 'Disconnected'>(
    'Disconnected',
  );
  readonly connectionState = this._connectionState.asReadonly();
  // activeToast signal to manage the currently displayed toast notification:
  private readonly _activeToast = signal<NotificationPayload | null>(null);
  readonly activeToast = this._activeToast.asReadonly();

  // Load initial notifications from API database
  loadInitialNotifications(initialList: NotificationPayload[]): void {
    this._notifications.set(initialList);
  }

  connect(userId: string): void {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`https://localhost:7182/hubs/notifications?userId=${userId}`)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.hubConnection.on('receiveNotification', (payload: NotificationPayload) => {
      // Prepend incoming outbox event to top of stream
      this._notifications.update((list) => [payload, ...list]);
      this.playAlertSound(payload.priority);
      this._activeToast.set(payload);
      setTimeout(() => this._activeToast.set(null), 4000); // Hide toast after 4 seconds
    });

    this.hubConnection.onreconnecting(() => this._connectionState.set('Reconnecting'));
    this.hubConnection.onreconnected(() => this._connectionState.set('Connected'));
    this.hubConnection.onclose(() => this._connectionState.set('Disconnected'));

    this.hubConnection
      .start()
      .then(() => this._connectionState.set('Connected'))
      .catch((err) => console.error('SignalR Hub Connection Error:', err));
  }

  markAsRead(notificationId: string): void {
    this._notifications.update((list) => list.filter((n) => n.id !== notificationId));
  }

  private playAlertSound(priority: number): void {
    if (priority >= 3) {
      // Web Audio API synth chime (No external audio file required)
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  }
}
