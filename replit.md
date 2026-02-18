# MedControl

## Overview
MedControl is a medication management mobile app built with Expo (React Native) and Express backend. It helps dependents take medications on time and allows a "Master" (responsible person) and "Control Contacts" to be notified if a dose is missed or stock runs out.

## Recent Changes
- 2026-02-18: Added notification system: notifications table, push_tokens table, notification endpoints (list, mark read, unread count), event-driven notifications (stock low/empty → Masters, connection request/accepted), notifications screen with bell icon + badge on Dashboard
- 2026-02-15: Added profile editing, UID copy, role switcher, connections management, premium upgrade flow, medication editing, and dose history tab
- 2026-02-15: Initial project setup with auth, medications CRUD, dashboard, and profile screens

## Architecture
- **Frontend**: Expo Router (file-based routing), React Native, TypeScript
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Auth**: Session-based (express-session + connect-pg-simple)
- **State**: React Query for server state, React Context for auth

## Data Models
- **users**: id, name, email, password, role (MASTER/DEPENDENT/CONTROLLER), planType (FREE/PREMIUM), linkedMasterId
- **medications**: id, name, dosage, currentStock, alertThreshold, intervalInHours, ownerId
- **dose_schedules**: id, medId, timeMillis, status (PENDING/TAKEN/MISSED), confirmedAt, ownerId
- **connections**: id, masterId, dependentId, status (PENDING/ACCEPTED)
- **notifications**: id, userId, type (STOCK_LOW/STOCK_EMPTY/CONNECTION_REQUEST/CONNECTION_ACCEPTED), title, message, read, relatedId, createdAt
- **push_tokens**: id, userId, token, createdAt

## Key Routes
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login
- GET /api/auth/me - Current user
- PATCH /api/auth/profile - Update profile (name, email)
- PATCH /api/auth/role - Change user role
- POST /api/auth/upgrade - Upgrade to PREMIUM plan (mock Stripe)
- GET /api/users/search/:identifier - Search user by ID or email
- GET/POST /api/medications - List/Create medications
- GET /api/medications/:id - Get single medication
- PATCH /api/medications/:id - Edit medication
- DELETE /api/medications/:id - Delete medication
- PATCH /api/medications/:id/stock - Update stock
- GET/POST /api/schedules - List/Create dose schedules
- GET /api/schedules/history - Get confirmed doses (reverse chronological)
- PATCH /api/schedules/:id/confirm - Confirm dose taken
- POST /api/medications/:id/take-dose - Single-call dose confirm (creates TAKEN schedule, decrements stock)
- GET /api/dependents - List dependents with summary stats (MASTER only)
- GET /api/dependents/:id/history - Dependent dose history with med names (MASTER only)
- GET /api/dependents/:id/medications - Dependent medications (MASTER only)
- GET/POST /api/connections - List/Create user connections
- DELETE /api/connections/:id - Remove connection
- PATCH /api/connections/:id/accept - Accept pending connection
- GET /api/notifications - List user notifications
- GET /api/notifications/unread-count - Unread notification count
- PATCH /api/notifications/:id/read - Mark notification as read
- PATCH /api/notifications/read-all - Mark all notifications as read
- POST /api/push-tokens - Register push token

## Screens
- **Login** (/login): Email/password login
- **Register** (/register): Name, email, password, role selector
- **Dashboard** (/(tabs)/index): Greeting, stats, medication list with dose confirm
- **Medications** (/(tabs)/medications): Segmented control (Remedios/Historico), medication cards, dose history
- **Profile** (/(tabs)/profile): Edit profile, copy UID, role switcher, plan upgrade, connections link
- **Connections** (/connections): Search/validate users, add/delete/accept connections
- **Add Medication** (/add-medication): Modal form to create medication
- **Edit Medication** (/edit-medication?id=xxx): Modal form to edit medication
- **Notifications** (/notifications): Notification center with bell icon badge, mark as read, mark all

## Connection Logic
- FREE plan: Max 1 dependent per Master
- PREMIUM plan: Unlimited dependents

## User Preferences
- Language: Portuguese (Brazilian)
- No XML, only Jetpack Compose style (adapted to React Native)
- camelCase variable naming
