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
- **Frontend**: React Native/Expo (mobile-first, cross-platform)
- **Authentication**: Supabase Auth with JWT tokens
- **Email**: Amazon SES for transactional emails (via Supabase SMTP configuration)

The application enables research groups to collaborate on projects, manage files, track progress through checklists, and coordinate team activities.

## Architecture

### System Components

```
┌─────────────────────────┐
│   React Native App      │
│   (Expo Framework)      │
└───────────┬─────────────┘
            │
            ├──── Direct Supabase Connection
            │     • Authentication
            │     • Database Queries (via RLS)
            │     • File Storage
            │     • Realtime Updates
            │
            ▼
┌─────────────────────────┐
│   Supabase Platform     │
│   - PostgreSQL DB       │
│   - Auth Service        │
│   - Storage Service     │
│   - Realtime Updates    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Amazon SES            │
│   (Email Service)       │
└─────────────────────────┘
```

### Key Design Decisions
1. **Direct Supabase Integration**: The app connects directly to Supabase without a backend server, leveraging RLS for security
2. **Mobile-First**: Built with React Native/Expo for iOS, Android, and web compatibility
3. **Row Level Security**: Database-level security policies ensure data isolation between groups
4. **Serverless Architecture**: No backend server needed - all business logic handled via Supabase functions and RLS policies

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

## Supabase Direct API Access

### Authentication
All database operations are performed directly through Supabase client library with RLS policies enforcing security. The app uses:

- **Supabase Auth**: Handles user registration, login, email verification, and password reset
- **JWT Tokens**: Automatically managed by Supabase client
- **Session Management**: Persisted in AsyncStorage for mobile apps

### Database Operations
Direct queries to Supabase tables with RLS policies:

#### Users
- Profile creation/updates via `supabase.from('users')`
- Automatic user creation on auth signup

#### Groups
- Create, read, update, delete operations
- Invite code generation and validation
- Membership management

#### Projects
- CRUD operations within groups
- File attachments via Storage API
- Checklist management
- Member assignments

### Storage Operations
- **profile-pictures bucket**: Public access for user avatars
- **project-files bucket**: Private with RLS policies
- Direct file upload/download via Supabase Storage API

### Real-time Subscriptions
- Group membership changes
- Join request notifications
- Project updates
- All handled via `supabase.channel()` subscriptions

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
1. **Row Level Security**: All database operations filtered by auth.uid()
2. **Supabase Auth**: Handles authentication and session management
3. **Storage Policies**: Separate policies for public and private buckets
4. **Rate Limiting**: Handled by Supabase platform limits

### Application Security
1. **Secure Storage**: Credentials stored in AsyncStorage
2. **HTTPS Only**: Supabase connections use TLS
3. **Environment Variables**: Sensitive data in .env files
4. **Input Sanitization**: Basic validation on all forms

## Identified Issues and Inconsistencies

### Current Considerations

1. **Serverless Architecture**
   - No backend server - all operations via Supabase
   - Simplified deployment and maintenance
   - Cost-effective for current scale

2. **Email Verification**
   - Fully functional via Supabase Auth
   - Redirects to https://macroscope.info/verify-email
   - Deep linking support for mobile apps

3. **Public Credentials**
   - Supabase URL and anon key are safely exposed in frontend
   - These are public by design and secured via RLS policies
   - Service role key never exposed to client

### Medium Priority Issues

4. **Rate Limiting**
   - Handled by Supabase platform (varies by plan)
   - Consider implementing application-level throttling for sensitive operations

5. **File Upload Security**
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

8. **Code Organization**
   - Clean separation between screens, services, and components
   - TypeScript interfaces for type safety
   - Consistent file structure

9. **Documentation**
    - No API documentation (OpenAPI/Swagger)
    - Missing code comments in complex functions
    - No deployment documentation

## Deployment and Environment

### Environment Variables

#### Frontend Configuration
```typescript
// src/config/supabase.ts
const supabaseUrl = 'https://ipaquntaeftocyvxoawo.supabase.co'
const supabaseAnonKey = '<anon_key>'
```

**Note**: The Supabase URL and anon key are public by design. They are safe to include in frontend code as all security is enforced through Row Level Security policies on the database side.

### Development Setup
1. Clone the repository
2. Install Node.js dependencies: `npm install`
3. Start Expo development server: `npm start`
4. Run on iOS simulator: `i`
5. Run on Android emulator: `a`
6. Run on web: `w`

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

The Research Coordinator Application has a solid foundation with modern technologies and excellent architectural choices:

**Strengths**:
- Clean serverless architecture with direct Supabase integration
- Strong security through Row Level Security policies
- Cross-platform support (iOS, Android, Web)
- Real-time collaboration features
- Cost-effective infrastructure

**Areas for Enhancement**:
- Add application-level rate limiting for sensitive operations
- Implement comprehensive testing suite
- Set up monitoring and analytics
- Complete Android deployment
- Finalize web hosting on AWS

The direct Supabase integration pattern eliminates the need for a backend server while maintaining security through RLS policies. This architecture is production-ready and scales well for the application's needs.