# Research Coordinator Application - Infrastructure Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Structure](#database-structure)
4. [Backend API](#backend-api)
5. [Frontend Application](#frontend-application)
6. [Authentication Flow](#authentication-flow)
7. [Security Implementation](#security-implementation)
8. [Identified Issues and Inconsistencies](#identified-issues-and-inconsistencies)
9. [Deployment and Environment](#deployment-and-environment)

## Overview

The Research Coordinator Application is a collaborative research management platform built with:
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Backend**: Node.js/Express with TypeScript
- **Frontend**: React Native/Expo (mobile-first, cross-platform)
- **Authentication**: Supabase Auth with JWT tokens

The application enables research groups to collaborate on projects, manage files, track progress through checklists, and coordinate team activities.

## Architecture

### System Components

```
┌─────────────────────────┐
│   React Native App      │
│   (Expo Framework)      │
└───────────┬─────────────┘
            │
            ├──── Direct Supabase Connection (Auth & Realtime)
            │
            ▼
┌─────────────────────────┐
│   Express Backend       │
│   (Node.js/TypeScript)  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Supabase Platform     │
│   - PostgreSQL DB       │
│   - Auth Service        │
│   - Storage Service     │
│   - Realtime Updates    │
└─────────────────────────┘
```

### Key Design Decisions
1. **Dual Connection Pattern**: The app connects directly to Supabase for auth and realtime updates, while using the Express backend for complex business logic
2. **Mobile-First**: Built with React Native/Expo for iOS, Android, and web compatibility
3. **Row Level Security**: Database-level security policies ensure data isolation between groups

## Database Structure

### Core Tables

#### 1. **users** - User accounts and profiles
```sql
- id (uuid, PK)
- username (varchar(50), unique)
- email (varchar(255), unique)
- bio (text)
- profile_picture (varchar(255))
- email_verified (boolean)
- verification_token (varchar(255))
- password_reset_token (varchar(255))
- created_at/updated_at (timestamptz)
```

#### 2. **groups** - Research groups
```sql
- id (uuid, PK)
- name (varchar(100))
- description (text)
- created_by (uuid, FK → users)
- invite_code (varchar(20), unique, auto-generated)
- created_at/updated_at (timestamptz)
```

#### 3. **projects** - Research projects within groups
```sql
- id (uuid, PK)
- name (varchar(100))
- description (text)
- group_id (uuid, FK → groups)
- created_by (uuid, FK → users)
- status (varchar(20): planning/in_progress/completed/on_hold)
- priority (varchar(20): high/medium/low/completed)
- notes (text)
- file_folder_path (varchar(255))
- created_at/updated_at (timestamptz)
```

#### 4. **group_memberships** - User-group associations
```sql
- id (uuid, PK)
- group_id (uuid, FK → groups)
- user_id (uuid, FK → users)
- role (varchar(20): admin/member)
- joined_at (timestamptz)
- Unique constraint: (group_id, user_id)
```

#### 5. **project_members** - Project team assignments
```sql
- id (uuid, PK)
- project_id (uuid, FK → projects)
- user_id (uuid, FK → users)
- role (text: member/editor/admin)
- added_by (uuid, FK → users)
- created_at (timestamptz)
- Unique constraint: (project_id, user_id)
```

#### 6. **project_files** - File attachments for projects
```sql
- id (uuid, PK)
- project_id (uuid, FK → projects)
- uploaded_by (uuid, FK → users)
- filename (varchar(255))
- original_name (varchar(255))
- file_size (bigint)
- mime_type (varchar(100))
- file_path (varchar(500))
- public_url (text)
- storage_path (text)
- uploaded_at (timestamptz)
```

#### 7. **group_join_requests** - Pending group membership requests
```sql
- id (uuid, PK)
- group_id (uuid, FK → groups)
- user_id (uuid, FK → users)
- status (varchar(20): pending/approved/rejected)
- message (text)
- requested_at (timestamptz)
- responded_at (timestamptz)
```

#### 8. **project_checklist_items** - Task tracking for projects
```sql
- id (uuid, PK)
- project_id (uuid, FK → projects)
- title (text)
- description (text)
- completed (boolean)
- created_by (uuid, FK → users)
- created_at/updated_at (timestamptz)
```

#### 9. **group_default_checklist_items** - Template checklist items for groups
```sql
- id (uuid, PK)
- group_id (uuid, FK → groups)
- title (text)
- description (text)
- display_order (integer)
- created_by (uuid, FK → users)
- created_at/updated_at (timestamptz)
```

### Database Triggers

1. **ensure_project_creator_is_member**: Automatically adds project creator as a project member
2. **on_join_request_approved**: Creates group membership when join request is approved
3. **update_*_updated_at**: Updates timestamp on record modification
4. **check_duplicate_request**: Prevents duplicate pending join requests

### Row Level Security (RLS) Policies

All tables have RLS enabled with policies ensuring:
- Users can only view/modify their own profile
- Group members can view group data
- Only group admins can manage group settings and memberships
- Project access is restricted to group members
- File operations require appropriate group membership

## Backend API

### Base URL: `http://localhost:3000/api`

### Authentication Endpoints (`/auth`)
- `POST /register` - User registration with email verification
- `POST /login` - User login, returns JWT token
- `GET /verify-email` - Email verification handler
- `POST /resend-verification` - Resend verification email
- `POST /forgot-password` - Initialize password reset
- `GET /reset-password` - Validate reset token
- `POST /reset-password` - Complete password reset

### User Endpoints (`/users`)
- `GET /profile` - Get current user profile
- `PUT /profile` - Update user profile
- `POST /profile/upload-picture` - Upload profile picture
- `POST /change-password` - Change user password

### Group Endpoints (`/groups`)
- `GET /` - List user's groups
- `POST /` - Create new group
- `GET /search` - Search groups by invite code
- `POST /:groupId/join` - Join group with invite code
- `POST /:groupId/request-join` - Request to join group
- `GET /:groupId/details` - Get group details with members
- `PUT /:groupId` - Update group information
- `DELETE /:groupId` - Delete group (creator only)
- `DELETE /:groupId/members/:userId` - Remove member
- `POST /:groupId/join-requests/:requestId/:action` - Approve/reject join request
- `GET /pending-requests-count` - Get count of pending requests
- `GET /:groupId/members` - List group members

### Project Endpoints (`/projects`)
- `GET /group/:groupId` - List group projects
- `POST /` - Create new project
- `GET /:projectId` - Get project details
- `PUT /:projectId` - Update project
- `DELETE /:projectId` - Delete project
- `POST /:projectId/checklist` - Add checklist item
- `PUT /:projectId/checklist/:itemId` - Update checklist item
- `DELETE /:projectId/checklist/:itemId` - Delete checklist item
- `GET /group/:groupId/members` - Get potential project members
- `POST /:projectId/assign` - Assign members to project
- `DELETE /:projectId/assign/:userId` - Remove project member
- `POST /:projectId/files` - Upload file (multipart/form-data)
- `GET /:projectId/files` - List project files
- `GET /:projectId/files/:fileId/download` - Download file
- `DELETE /:projectId/files/:fileId` - Delete file

### Middleware
- **authenticateToken**: JWT validation for protected routes
- **CORS**: Enabled for cross-origin requests
- **Body Parser**: JSON (50MB limit) and URL-encoded support

## Frontend Application

### Technology Stack
- **Framework**: React Native with Expo SDK 53
- **UI Library**: React Native Paper (Material Design)
- **State Management**: React hooks (useState, useEffect)
- **Navigation**: Custom screen-based navigation
- **Storage**: AsyncStorage for local persistence
- **Authentication**: Supabase Auth SDK

### Screen Architecture

1. **Authentication Screens**
   - LoginScreen
   - RegisterScreen
   - EmailVerificationScreen
   - ForgotPasswordScreen

2. **Main Application Screens**
   - ResearchGroupsScreen (home/dashboard)
   - ProjectsScreen (project list per group)
   - ProjectDetailsScreen (individual project view)
   - CreateProjectScreen
   - CreateGroupScreen
   - JoinGroupScreen

3. **User Management Screens**
   - ProfileScreen
   - SettingsScreen
   - ResearchGroupSettingsScreen

### Key Features
- **Real-time Updates**: Supabase realtime subscriptions for group memberships and join requests
- **File Management**: Document picker and image picker integration
- **Offline Support**: AsyncStorage for session persistence
- **Cross-Platform**: iOS, Android, and web support

## Authentication Flow

### Registration Flow
1. User submits registration form
2. Backend creates Supabase auth user
3. Database trigger creates user profile
4. Verification email sent (currently disabled)
5. User can log in immediately

### Login Flow
1. User submits credentials
2. Supabase Auth validates credentials
3. Backend generates JWT token
4. Frontend stores session in AsyncStorage
5. App navigates to main screen

### Session Management
- JWT tokens expire after 24 hours
- Refresh tokens handled automatically by Supabase
- Session persistence across app restarts
- Automatic logout on token expiration

## Security Implementation

### Database Security
1. **Row Level Security (RLS)**: All tables have RLS enabled
2. **Service Role Access**: Limited to specific operations
3. **Foreign Key Constraints**: Cascade deletes maintain referential integrity
4. **Input Validation**: Check constraints on enums and data types

### API Security
1. **JWT Authentication**: All protected routes require valid tokens
2. **User Context**: auth.uid() used in all RLS policies
3. **CORS Configuration**: Restricted to allowed origins
4. **Rate Limiting**: Not currently implemented (recommended)

### Application Security
1. **Secure Storage**: Credentials stored in AsyncStorage
2. **HTTPS Only**: Supabase connections use TLS
3. **Environment Variables**: Sensitive data in .env files
4. **Input Sanitization**: Basic validation on all forms

## Identified Issues and Inconsistencies

### Critical Issues

1. **Backend Server Not Required for Basic Operation**
   - The app connects directly to Supabase for most operations
   - Backend is only needed for file uploads and complex operations
   - This creates confusion about when the backend is needed

2. **Duplicate Route Files**
   - Multiple versions of route files exist (groups.ts, groups-temp.ts, groups-full.ts, groups-demo.ts)
   - Should consolidate to single, authoritative versions

3. **Inconsistent Error Handling**
   - Some endpoints return detailed errors, others return generic messages
   - No standardized error response format

4. **Missing Email Verification**
   - Email verification is disabled (emailRedirectTo: undefined)
   - Users can access the app without verifying email

### Medium Priority Issues

5. **No Rate Limiting**
   - API endpoints have no rate limiting
   - Vulnerable to abuse and DOS attacks

6. **File Upload Security**
   - No virus scanning on uploaded files
   - File size limits only enforced client-side
   - No file type validation beyond MIME type

7. **Password Requirements**
   - No password complexity requirements enforced
   - Minimum length not validated

8. **Session Management**
   - No session revocation mechanism
   - Cannot force logout from other devices

### Low Priority Issues

9. **Code Organization**
   - Demo routes mixed with production code
   - Unused SQL migration files in repository
   - No clear separation of concerns in some components

10. **Documentation**
    - No API documentation (OpenAPI/Swagger)
    - Missing code comments in complex functions
    - No deployment documentation

## Deployment and Environment

### Environment Variables

#### Backend (.env)
```bash
SUPABASE_URL=https://ipaquntaeftocyvxoawo.supabase.co
SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
JWT_SECRET=<jwt_secret>
PORT=3000
```

#### Frontend (hardcoded - should be environment variables)
```typescript
const supabaseUrl = 'https://ipaquntaeftocyvxoawo.supabase.co'
const supabaseAnonKey = '<anon_key>'
```

### Development Setup
1. Install PostgreSQL (via Supabase)
2. Run database migrations
3. Install Node.js dependencies
4. Start backend server: `npm run dev`
5. Start Expo development server: `npm start`

### Production Considerations
- SSL certificates required for HTTPS
- Database backups not configured
- No monitoring or logging infrastructure
- No CI/CD pipeline
- No containerization (Docker)

## Recommendations for Future Development

### High Priority
1. Consolidate and clean up duplicate route files
2. Implement proper email verification
3. Add rate limiting to all API endpoints
4. Standardize error handling and responses
5. Move frontend configuration to environment variables

### Medium Priority
6. Add comprehensive logging and monitoring
7. Implement file upload security measures
8. Add password complexity requirements
9. Create API documentation (OpenAPI/Swagger)
10. Set up automated testing

### Low Priority
11. Implement session management features
12. Add database backup strategy
13. Create deployment automation
14. Add performance monitoring
15. Implement caching strategy

## Conclusion

The Research Coordinator Application has a solid foundation with modern technologies and good architectural choices. The main areas for improvement are:
- Security hardening (rate limiting, file validation)
- Code organization and cleanup
- Documentation and testing
- Production readiness (monitoring, backups, deployment)

The dual connection pattern (direct Supabase + Express backend) works but could be simplified by choosing one approach consistently. The application would benefit from a comprehensive security audit and performance optimization before production deployment.