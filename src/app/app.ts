import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { SignalrService } from './core/services/signalr.service';
import { NotificationApiService } from './core/services/notification-api.service';

type FilterType = 'all' | 'critical' | 'unread';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="layout">
      <div *ngIf="signalrService.activeToast()" class="toast-popup">
        <i class="fa-solid fa-bell"></i>
        <div>
          <strong>{{ signalrService.activeToast()?.title }}</strong>
          <p>{{ signalrService.activeToast()?.message }}</p>
        </div>
      </div>
      <!-- Navbar Header -->
      <header class="navbar">
        <div class="nav-brand">
          <i class="fa-solid fa-server brand-icon"></i>
          <span>NotificationEngine <strong>Hub</strong></span>
        </div>

        <div class="nav-actions">
          <!-- Live Transport Status -->
          <div class="connection-status" [ngClass]="signalrService.connectionState().toLowerCase()">
            <span class="dot"></span>
            SignalR: {{ signalrService.connectionState() }}
          </div>

          <!-- Notification Bell Dropdown -->
          <div class="bell-container">
            <button class="bell-btn" (click)="toggleDropdown()">
              <i class="fa-regular fa-bell"></i>
              <span *ngIf="signalrService.unreadCount() > 0" class="badge">
                {{ signalrService.unreadCount() }}
              </span>
            </button>

            <!-- Dropdown Panel -->
            <div *ngIf="isDropdownOpen" class="dropdown-panel">
              <div class="dropdown-header">
                <span>Real-Time Stream</span>
                <button class="btn-link" (click)="dismissAll()">Clear All</button>
              </div>
              <div class="dropdown-body">
                <div
                  *ngFor="let item of signalrService.notifications()"
                  class="notification-card"
                  (click)="dismissNotification(item.id)"
                >
                  <div class="card-icon" [ngClass]="getPriorityClass(item.priority)">
                    <i class="fa-solid" [ngClass]="getPriorityIcon(item.priority)"></i>
                  </div>
                  <div class="card-content">
                    <h4>{{ item.title }}</h4>
                    <p>{{ item.message }}</p>
                    <small>{{ item.createdAt | date: 'mediumTime' }}</small>
                  </div>
                </div>
                <div *ngIf="signalrService.notifications().length === 0" class="empty-state">
                  <i class="fa-solid fa-check-double"></i>
                  <p>All catch-up events cleared!</p>
                </div>
              </div>
            </div>
          </div>

          <div class="user-profile">
            <img
              src="https://ui-avatars.com/api/?name=Architect+User&background=0D8ABC&color=fff"
              alt="User"
            />
          </div>
        </div>
      </header>

      <!-- Main Dashboard -->
      <main class="dashboard">
        <div class="dashboard-header">
          <div>
            <h2>Distributed Event & Outbox Dispatcher</h2>
            <p>Clean Architecture .NET 9 WebSockets + Redis Backplane + Angular Signals</p>
          </div>
          <div class="action-group">
            <button class="btn-primary" (click)="triggerOutboxEvent(3)">
              <i class="fa-solid fa-triangle-exclamation"></i> Trigger Critical Outbox
            </button>
            <button class="btn-secondary" (click)="triggerOutboxEvent(1)">
              <i class="fa-solid fa-paper-plane"></i> Send Standard Event
            </button>
          </div>
        </div>

        <!-- Telemetry Metrics Grid -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-title">Active Queue Stream</div>
            <div class="metric-value text-accent">{{ signalrService.unreadCount() }}</div>
            <i class="fa-solid fa-bell metric-bg-icon"></i>
          </div>
          <div class="metric-card">
            <div class="metric-title">Critical Severity</div>
            <div class="metric-value text-danger">{{ signalrService.criticalCount() }}</div>
            <i class="fa-solid fa-bolt metric-bg-icon"></i>
          </div>
          <div class="metric-card">
            <div class="metric-title">Reliability Strategy</div>
            <div class="metric-value text-success">Transactional Outbox</div>
            <i class="fa-solid fa-shield-halved metric-bg-icon"></i>
          </div>
          <!-- NEW CARD -->
          <div class="metric-card">
            <div class="metric-title">Outbox Delivery Latency</div>
            <div class="metric-value text-success">&lt; 15 ms</div>
            <i class="fa-solid fa-gauge-high metric-bg-icon"></i>
          </div>
        </div>

        <!-- Notification Feed & Stream -->
        <div class="feed-container">
          <div class="feed-header">
            <h3>Event Delivery Log</h3>
            <div class="filter-pills">
              <button [class.active]="activeFilter() === 'all'" (click)="activeFilter.set('all')">
                All Messages ({{ signalrService.unreadCount() }})
              </button>
              <button
                [class.active]="activeFilter() === 'critical'"
                (click)="activeFilter.set('critical')"
              >
                Critical Only ({{ signalrService.criticalCount() }})
              </button>
            </div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Event Title</th>
                <th>Payload Content</th>
                <th>Timestamp</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of filteredNotifications()">
                <td>
                  <span class="priority-tag" [ngClass]="getPriorityClass(item.priority)">
                    Priority {{ item.priority }}
                  </span>
                </td>
                <td>
                  <strong>{{ item.title }}</strong>
                </td>
                <td>{{ item.message }}</td>
                <td>{{ item.createdAt | date: 'hh:mm:ss a' }}</td>
                <td>
                  <button class="btn-sm" (click)="dismissNotification(item.id)">Acknowledge</button>
                </td>
              </tr>
              <tr *ngIf="filteredNotifications().length === 0">
                <td colspan="5" class="empty-table">
                  No active events in stream. Click <strong>Trigger Critical Outbox</strong> to test
                  live processing.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      .toast-popup {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #0f172a;
        color: white;
        padding: 14px 20px;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
      }
      @keyframes slideIn {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      .layout {
        min-height: 100vh;
        background-color: #f8fafc;
        font-family: 'Inter', sans-serif;
      }
      .navbar {
        height: 65px;
        background: white;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 30px;
      }
      .nav-brand {
        font-size: 18px;
        color: #0f172a;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .brand-icon {
        color: #2563eb;
        font-size: 20px;
      }
      .nav-actions {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .connection-status {
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .connection-status.connected {
        background: #dcfce7;
        color: #15803d;
      }
      .connection-status.reconnecting {
        background: #fef3c7;
        color: #b45309;
      }
      .connection-status.disconnected {
        background: #fee2e2;
        color: #b91c1c;
      }
      .connection-status .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }

      .bell-container {
        position: relative;
      }
      .bell-btn {
        background: #f1f5f9;
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        position: relative;
        font-size: 16px;
        color: #475569;
      }
      .badge {
        position: absolute;
        top: -2px;
        right: -2px;
        background: #ef4444;
        color: white;
        font-size: 10px;
        font-weight: 700;
        border-radius: 10px;
        padding: 2px 6px;
      }

      .dropdown-panel {
        position: absolute;
        right: 0;
        top: 48px;
        width: 340px;
        background: white;
        border-radius: 10px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        border: 1px solid #e2e8f0;
        z-index: 100;
      }
      .dropdown-header {
        padding: 12px 16px;
        border-bottom: 1px solid #f1f5f9;
        display: flex;
        justify-content: space-between;
        font-weight: 600;
        font-size: 13px;
      }
      .btn-link {
        background: none;
        border: none;
        color: #2563eb;
        font-size: 12px;
        cursor: pointer;
      }
      .dropdown-body {
        max-height: 320px;
        overflow-y: auto;
      }
      .notification-card {
        padding: 12px;
        border-bottom: 1px solid #f8fafc;
        display: flex;
        gap: 10px;
        cursor: pointer;
      }
      .notification-card:hover {
        background: #f8fafc;
      }
      .card-content h4 {
        margin: 0 0 2px 0;
        font-size: 13px;
        color: #0f172a;
      }
      .card-content p {
        margin: 0;
        font-size: 12px;
        color: #64748b;
      }
      .card-content small {
        font-size: 10px;
        color: #94a3b8;
      }
      .empty-state {
        padding: 20px;
        text-align: center;
        color: #94a3b8;
        font-size: 13px;
      }

      .dashboard {
        padding: 30px;
        max-width: 1100px;
        margin: 0 auto;
      }
      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      .dashboard-header h2 {
        margin: 0;
        color: #0f172a;
        font-size: 22px;
      }
      .dashboard-header p {
        margin: 4px 0 0 0;
        color: #64748b;
        font-size: 13px;
      }
      .action-group {
        display: flex;
        gap: 10px;
      }

      .btn-primary {
        background: #2563eb;
        color: white;
        border: none;
        padding: 10px 18px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .btn-primary:hover {
        background: #1d4ed8;
      }
      .btn-secondary {
        background: white;
        border: 1px solid #cbd5e1;
        color: #334155;
        padding: 10px 18px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 24px;
      }
      .metric-card {
        background: white;
        padding: 18px;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
        position: relative;
        overflow: hidden;
      }
      .metric-title {
        font-size: 12px;
        color: #64748b;
        font-weight: 600;
      }
      .metric-value {
        font-size: 22px;
        font-weight: 700;
        margin-top: 6px;
      }
      .metric-bg-icon {
        position: absolute;
        right: 16px;
        bottom: 12px;
        font-size: 36px;
        color: #f1f5f9;
      }
      .text-accent {
        color: #2563eb;
      }
      .text-danger {
        color: #dc2626;
      }
      .text-success {
        color: #16a34a;
      }

      .feed-container {
        background: white;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
        padding: 20px;
      }
      .feed-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .feed-header h3 {
        margin: 0;
        font-size: 16px;
        color: #0f172a;
      }

      .filter-pills {
        display: flex;
        gap: 6px;
      }
      .filter-pills button {
        background: #f1f5f9;
        border: none;
        padding: 6px 14px;
        border-radius: 16px;
        font-size: 12px;
        cursor: pointer;
        color: #64748b;
        font-weight: 500;
      }
      .filter-pills button.active {
        background: #2563eb;
        color: white;
      }

      .data-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
      }
      .data-table th {
        padding: 10px 12px;
        background: #f8fafc;
        color: #475569;
        font-size: 11px;
        text-transform: uppercase;
        border-bottom: 1px solid #e2e8f0;
      }
      .data-table td {
        padding: 12px;
        border-bottom: 1px solid #f1f5f9;
        font-size: 13px;
        color: #334155;
      }
      .empty-table {
        text-align: center;
        color: #64748b;
        padding: 30px !important;
      }

      .priority-tag {
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
      }
      .priority-tag.p-high {
        background: #fee2e2;
        color: #991b1b;
      }
      .priority-tag.p-low {
        background: #e0e7ff;
        color: #3730a3;
      }

      .btn-sm {
        padding: 4px 10px;
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  protected readonly signalrService = inject(SignalrService);
  private readonly apiService = inject(NotificationApiService);
  private readonly http = inject(HttpClient);

  protected readonly userId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
  protected isDropdownOpen = false;
  protected activeFilter = signal<FilterType>('all');

  protected filteredNotifications = computed(() => {
    const list = this.signalrService.notifications();
    if (this.activeFilter() === 'critical') {
      return list.filter((n) => n.priority >= 3);
    }
    return list;
  });

  ngOnInit(): void {
    // 1. Fetch historical unread notifications from backend DB
    this.apiService.getUnreadNotifications(this.userId).subscribe({
      next: (data) => this.signalrService.loadInitialNotifications(data),
      error: () => console.warn('Backend API offline. Running in WebSocket live mode.'),
    });

    // 2. Establish live WebSocket connection
    this.signalrService.connect(this.userId);
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  dismissNotification(id: string): void {
    this.apiService.markAsRead(id).subscribe();
    this.signalrService.markAsRead(id);
  }

  dismissAll(): void {
    this.apiService.markAllAsRead(this.userId).subscribe();
    const ids = this.signalrService.notifications().map((n) => n.id);
    ids.forEach((id) => this.signalrService.markAsRead(id));
  }

  triggerOutboxEvent(priority: number): void {
    const payload = {
      userId: this.userId,
      title: priority >= 3 ? 'Critical Outbox Event' : 'Standard Pipeline Test',
      message:
        priority >= 3
          ? 'High severity outbox entry dispatched to Redis backplane.'
          : 'Transactional outbox record processed successfully.',
      channel: 1,
      priority,
    };

    this.http.post('https://localhost:7182/api/Notifications', payload).subscribe();
  }

  getPriorityClass(priority: number): string {
    return priority >= 3 ? 'p-high' : 'p-low';
  }

  getPriorityIcon(priority: number): string {
    return priority >= 3 ? 'fa-triangle-exclamation' : 'fa-bell';
  }
}
