# MedControl

## Overview
MedControl is a medication management mobile app built with Expo (React Native) and Express backend. It helps dependents take medications on time and allows a "Master" (responsible person) and "Control Contacts" to be notified if a dose is missed or stock runs out.

## Recent Changes
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
- GET/POST /api/connections - List/Create user connections
- DELETE /api/connections/:id - Remove connection
- PATCH /api/connections/:id/accept - Accept pending connection

## Screens
- **Login** (/login): Email/password login
- **Register** (/register): Name, email, password, role selector
- **Dashboard** (/(tabs)/index): Greeting, stats, medication list with dose confirm
- **Medications** (/(tabs)/medications): Segmented control (Remedios/Historico), medication cards, dose history
- **Profile** (/(tabs)/profile): Edit profile, copy UID, role switcher, plan upgrade, connections link
- **Connections** (/connections): Search/validate users, add/delete/accept connections
- **Add Medication** (/add-medication): Modal form to create medication
- **Edit Medication** (/edit-medication?id=xxx): Modal form to edit medication

## Connection Logic
- FREE plan: Max 1 dependent per Master
- PREMIUM plan: Unlimited dependents

## User Preferences
- Language: Portuguese (Brazilian)
- No XML, only Jetpack Compose style (adapted to React Native)
- camelCase variable naming
