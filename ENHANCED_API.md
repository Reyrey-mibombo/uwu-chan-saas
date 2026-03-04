# Enhanced Dashboard API Documentation

This document describes the new API endpoints added to support the web dashboard functionality.

## New API Routes

### 1. Advanced Analytics API (`/api/advanced`)

#### Real-time Analytics
- `GET /api/advanced/guild/:guildId/analytics/overview?days=7`
  - Returns comprehensive analytics overview for a guild
  - Includes staff count, activity breakdown, daily activity stats

- `GET /api/advanced/guild/:guildId/analytics/heatmap?days=7`
  - Returns activity heatmap data by day and hour

- `GET /api/advanced/guild/:guildId/analytics/staff-performance?limit=20`
  - Returns detailed staff performance metrics with productivity scores

#### Bulk Operations
- `POST /api/advanced/guild/:guildId/bulk/points`
  - Bulk add/remove points for multiple users
  - Body: `{ userIds: [], points: number, reason: string, operation: 'add'|'remove' }`

- `POST /api/advanced/guild/:guildId/bulk/rank`
  - Bulk update ranks for multiple users
  - Body: `{ userIds: [], rank: string, reason: string }`

#### Export Functionality
- `GET /api/advanced/guild/:guildId/export/staff?format=json|csv`
  - Export staff data in JSON or CSV format

- `GET /api/advanced/guild/:guildId/export/shifts?format=json|csv&startDate=&endDate=`
  - Export shift data in JSON or CSV format

#### Server Management
- `POST /api/advanced/guild/:guildId/purge`
  - Purge old data (warnings, activities, shifts)
  - Body: `{ type: 'warnings'|'activities'|'shifts', olderThanDays: number, userId?: string }`

- `GET /api/advanced/guild/:guildId/compare?compareGuildId=`
  - Compare statistics between two guilds

#### Super Admin Endpoints (requires `x-admin-token` header)
- `GET /api/advanced/admin/overview`
  - Global bot statistics overview

- `GET /api/advanced/admin/guilds?page=1&limit=50&tier=&search=`
  - List all guilds with filtering

- `PATCH /api/advanced/admin/guilds/:guildId/premium`
  - Modify guild premium status

- `DELETE /api/advanced/admin/guilds/:guildId`
  - Delete guild data (with optional purge)

- `GET /api/advanced/admin/users/:userId`
  - Get detailed user information

### 2. Management API (`/api/management`)

#### Subscription & Payment
- `GET /api/management/guild/:guildId/subscription`
  - Get detailed subscription information

- `GET /api/management/guild/:guildId/invoices`
  - Get payment/invoice history

- `POST /api/management/guild/:guildId/cancel-subscription`
  - Cancel active subscription

#### Audit Logs
- `GET /api/management/guild/:guildId/audit-logs?type=&userId=&limit=50&page=1`
  - Get audit log entries with filtering

- `GET /api/management/guild/:guildId/audit-logs/types`
  - Get available audit log types

#### Applications
- `GET /api/management/guild/:guildId/applications/requests?status=&limit=50&page=1`
  - Get application requests

- `PATCH /api/management/guild/:guildId/applications/:applicationId`
  - Update application status

#### Tickets
- `GET /api/management/guild/:guildId/tickets/detailed?status=&category=&limit=50&page=1`
  - Get detailed ticket information with stats

#### Dashboard Widgets
- `GET /api/management/guild/:guildId/widgets/overview`
  - Get quick stats for dashboard widgets

- `GET /api/management/guild/:guildId/widgets/chart-data?days=14`
  - Get chart data for visualizations

### 3. Health & Monitoring API (`/api/health`)

#### Health Checks
- `GET /api/health/health`
  - Basic health check with system stats

- `GET /api/health/health/detailed`
  - Detailed health check with latency metrics

#### Metrics
- `GET /api/health/metrics`
  - Bot-wide metrics and statistics

- `GET /api/health/metrics/guilds?limit=50`
  - Guild-specific metrics

#### Bot Statistics
- `GET /api/health/bot/stats`
  - Bot feature and command statistics

- `GET /api/health/bot/commands`
  - List all available commands

#### Real-time Status
- `GET /api/health/status/live`
  - Live operational status

## Environment Variables

Add the following to your `.env` file:

```env
# Super Admin Token (for admin panel access)
SUPER_ADMIN_TOKEN=your_super_secure_admin_token_here
```

## Authentication

### Discord OAuth
Most endpoints require Discord OAuth authentication via Bearer token:
```
Authorization: Bearer <discord_access_token>
```

### Super Admin Token
Admin endpoints require the super admin token:
```
x-admin-token: <SUPER_ADMIN_TOKEN>
```

## Analytics System Enhancements

The analytics system now includes methods for web dashboard support:

- `getDashboardStats(guildId, days)` - Get dashboard-optimized stats
- `getRealTimeMetrics(guildId)` - Get real-time activity metrics
- `getPerformanceMetrics(guildId)` - Get detailed performance metrics
- `generateComparisonReport(guildId, compareGuildId, days)` - Compare two guilds

## License System Enhancements

The license system now includes admin panel methods:

- `getLicenseStats()` - Get global license statistics
- `revokeLicense(key, reason)` - Revoke a license
- `bulkCreateLicenses(count, tier, adminId)` - Create multiple licenses
- `getLicenseDetails(key)` - Get detailed license info
- `transferLicense(key, newGuildId, newUserId)` - Transfer license ownership

## Dashboard Systems

The existing dashboard systems now integrate with the new API endpoints for:
- Real-time automod, antispam, welcome, autorole, and logging configuration
- Settings cache invalidation on updates
- Enhanced event logging

## Security Features

All new endpoints include:
- Discord OAuth authentication
- Guild permission verification (MANAGE_GUILD)
- Super admin token protection for admin endpoints
- Input sanitization to prevent NoSQL injection
- Rate limiting via existing Express middleware
