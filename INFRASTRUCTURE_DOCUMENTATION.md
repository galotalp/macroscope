# 📋 MacroScope Infrastructure Documentation

*Comprehensive technical documentation for future Claude instances*

---

## 🚨 **CRITICAL: Mandatory Development Workflow**

**⚠️ ALL FUTURE LLMs WORKING ON THIS PROJECT MUST FOLLOW THIS WORKFLOW ⚠️**

### **Rule #1: NEVER Edit Production Files Directly**
- **NEVER** edit files directly on the EC2 production server
- **NEVER** make changes without first updating the GitHub repository
- **ALWAYS** maintain consistency between local, repository, and production environments

### **Mandatory Workflow for ALL Code Changes:**

1. **Read & Understand**: Always read existing files first to understand current implementation
2. **Edit Locally**: Make ALL changes to the local codebase first
3. **Test Changes**: Verify changes work locally when possible
4. **Commit to Git**: Stage, commit, and push changes to GitHub repository
5. **Deploy to Production**: Pull changes from repository to EC2 and restart services

### **Correct Deployment Commands:**
```bash
# Step 1: Commit changes locally
git add .
git commit -m "Descriptive commit message"
git push origin main

# Step 2: Deploy to EC2
ssh -i ~/Downloads/macroscope-key.pem ec2-user@18.213.201.127 "cd macroscope && git pull origin main && cd backend && npm run build && pm2 restart macroscope-backend --update-env"
```

### **Why This Matters:**
- **Version Control**: Maintains complete history of all changes
- **Collaboration**: Other developers can see what was changed and why
- **Disaster Recovery**: Can restore from repository if server fails
- **Code Review**: Changes can be reviewed and tracked
- **Consistency**: Prevents drift between environments

### **Consequences of Violating This Rule:**
- Code changes get lost during server restarts
- Inconsistencies between environments cause bugs
- No record of what changes were made
- Cannot rollback problematic changes
- Wastes time re-implementing lost changes

**🔒 This workflow is NON-NEGOTIABLE for all future work on this project.**

---

## 📖 Table of Contents
1. [Application Overview](#application-overview)
2. [Architecture Components](#architecture-components)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Database Schema](#database-schema)
6. [API Reference](#api-reference)
7. [Security Implementation](#security-implementation)
8. [Deployment Infrastructure](#deployment-infrastructure)
9. [Configuration Management](#configuration-management)
10. [File System Structure](#file-system-structure)
11. [Common Tasks](#common-tasks)

---

## 🎯 Application Overview

**MacroScope** is a full-stack React Native mobile application designed for research coordination and project management. It enables academic researchers to organize into groups, manage collaborative projects, share files, and track progress through task checklists.

### **Core Technologies**
- **Frontend**: React Native 0.79.5 + Expo 53 + React Native Paper
- **Backend**: Node.js 20.x + Express.js 5.1.0 + TypeScript
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Storage**: Supabase Storage for file uploads
- **Authentication**: JWT + bcrypt + Email verification
- **Email Service**: AWS SES
- **Deployment**: AWS EC2 + PM2 process manager

---

## 🏗️ Architecture Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   Web Browser   │    │   Expo CLI      │
│  (iOS/Android)  │    │    (PWA)        │    │ (Development)   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
          ┌─────────────────────────────────────────────┐
          │          HTTPS/SSL Load Balancer           │
          │         api.macroscope.info                │
          └─────────────────┬───────────────────────────┘
                            │
          ┌─────────────────────────────────────────────┐
          │              AWS EC2 Instance               │
          │           (Ubuntu + PM2 + Nginx)           │
          │              18.213.201.127                 │
          └─────────────────┬───────────────────────────┘
                            │
    ┌───────────────────────┼───────────────────────────┐
    │                       │                           │
┌───▼────┐         ┌────────▼─────────┐         ┌──────▼─────┐
│Supabase│         │   Express.js     │         │  AWS SES   │
│Database│         │   Backend API    │         │Email Service│
│+Storage│         │   (Port 3000)    │         │            │
└────────┘         └──────────────────┘         └────────────┘
```

---

## 📱 Frontend Architecture

### **Project Structure**
```
ResearchCoordinatorApp/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── UserAvatar.tsx
│   │   ├── UserMenuDropdown.tsx
│   │   └── ProfilePictureSelector.tsx
│   ├── screens/              # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── EmailVerificationScreen.tsx
│   │   ├── ForgotPasswordScreen.tsx
│   │   ├── ResearchGroupsScreen.tsx
│   │   ├── JoinGroupScreen.tsx
│   │   ├── CreateGroupScreen.tsx
│   │   ├── ResearchGroupSettingsScreen.tsx
│   │   ├── ProjectsScreen.tsx
│   │   ├── CreateProjectScreen.tsx
│   │   ├── ProjectDetailsScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── services/             # API and external services
│   │   └── api.ts
│   ├── utils/                # Utility functions
│   │   ├── avatarUtils.ts
│   │   └── errorMessages.ts
│   ├── types/                # TypeScript definitions
│   │   └── index.ts
│   ├── theme.ts              # Design system
│   └── config.ts             # Configuration
├── assets/                   # Static assets
│   ├── adaptive-icon.png
│   ├── icon.png
│   └── default-avatars/
├── App.tsx                   # Root component
├── app.json                  # Expo configuration
├── package.json              # Dependencies
└── tsconfig.json             # TypeScript config
```

### **Navigation System**
Custom state-based navigation with screen types:
```typescript
type Screen = 
  | 'login' 
  | 'register' 
  | 'email-verification' 
  | 'forgot-password' 
  | 'groups' 
  | 'profile' 
  | 'settings' 
  | 'join-group' 
  | 'create-group' 
  | 'projects' 
  | 'group-settings';
```

### **Theme System**
Comprehensive design system with:
- **Colors**: MacroScope brand palette (cream/beige primary colors)
- **Typography**: Consistent font sizes and weights
- **Spacing**: Standardized spacing scale
- **Shadows**: Material Design elevation
- **Border Radius**: Consistent corner rounding

### **API Integration Pattern**
Centralized API service with:
- JWT token management via AsyncStorage
- Automatic token refresh
- Error handling with user-friendly messages
- Base64 file upload support
- Platform-specific API URL configuration

---

## 🖥️ Backend Architecture

### **Project Structure**
```
backend/
├── src/
│   ├── config/
│   │   └── database.ts       # Supabase client configuration
│   ├── middleware/
│   │   └── auth.ts          # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.ts          # Authentication endpoints
│   │   ├── users.ts         # User management endpoints
│   │   ├── groups.ts        # Group management endpoints
│   │   └── projects.ts      # Project & file management
│   └── index.ts             # Application entry point
├── dist/                    # Compiled JavaScript
├── logs/                    # Application logs
├── uploads/                 # Temporary file storage
├── database/
│   └── migrations/          # SQL migration files
├── ecosystem.config.js      # PM2 configuration
├── package.json             # Dependencies
└── tsconfig.json           # TypeScript configuration
```

### **Express.js Application Structure**
```typescript
// Main application setup
const app = express();

// Middleware stack
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Route mounting
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/groups', authenticateToken, groupRoutes);
app.use('/api/projects', authenticateToken, projectRoutes);
```

### **Database Integration**
- **Primary**: Supabase with service role for backend operations
- **Fallback**: Demo mode with in-memory storage for development
- **Security**: Row Level Security (RLS) policies
- **Connection**: Singleton pattern with error handling

---

## 🗄️ Database Schema

### **Core Tables Overview**
```sql
-- Users table with email verification
users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    bio TEXT,
    profile_picture VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_token_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Research groups
groups (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    invite_code VARCHAR(20) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Group memberships with role management
group_memberships (
    id UUID PRIMARY KEY,
    group_id UUID REFERENCES groups(id),
    user_id UUID REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'member', -- 'admin', 'member'
    joined_at TIMESTAMP DEFAULT NOW()
);

-- Projects within groups
projects (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    group_id UUID REFERENCES groups(id),
    created_by UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'planning',
    priority VARCHAR(20) DEFAULT 'medium',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Project file storage metadata
project_files (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id),
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    file_path VARCHAR(500),
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Task checklists for projects
checklist_items (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    order_index INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Row Level Security Policies**
All tables implement RLS with policies for:
- Users can only access their own data
- Group members can access group-related data
- Project members can access project-related data
- Admins have additional permissions for management

---

## 🔌 API Reference

### **Authentication Endpoints (`/api/auth/`)**
```http
POST   /api/auth/register              # User registration + email verification
POST   /api/auth/login                 # User authentication
GET    /api/auth/verify-email          # Email verification (from email link)
POST   /api/auth/resend-verification   # Resend verification email
POST   /api/auth/forgot-password       # Request password reset
GET    /api/auth/reset-password        # Password reset form (from email link)
POST   /api/auth/reset-password        # Submit new password
```

### **User Management (`/api/users/`)**
```http
GET    /api/users/profile              # Get current user profile
PUT    /api/users/profile              # Update user profile
POST   /api/users/profile/upload-picture # Upload profile picture
POST   /api/users/change-password      # Change password
```

### **Group Management (`/api/groups/`)**
```http
GET    /api/groups                     # List user's groups
POST   /api/groups                     # Create new group
GET    /api/groups/search              # Search available groups
POST   /api/groups/:id/join            # Join group (if public)
POST   /api/groups/:id/request-join    # Request to join private group
GET    /api/groups/:id/details         # Get group details (admin only)
PUT    /api/groups/:id                 # Update group
DELETE /api/groups/:id                 # Delete group
GET    /api/groups/:id/members         # Get group members
```

### **Project Management (`/api/projects/`)**
```http
GET    /api/projects/group/:groupId    # List group projects
POST   /api/projects                   # Create new project
GET    /api/projects/:id               # Get project details
PUT    /api/projects/:id               # Update project
DELETE /api/projects/:id               # Delete project

# Checklist management
POST   /api/projects/:id/checklist     # Add checklist item
PUT    /api/projects/:id/checklist/:itemId # Update checklist item
DELETE /api/projects/:id/checklist/:itemId # Delete checklist item

# File management
POST   /api/projects/:id/files         # Upload file (base64)
GET    /api/projects/:id/files         # List project files
GET    /api/projects/:id/files/:fileId/download # Download file
DELETE /api/projects/:id/files/:fileId # Delete file
```

---

## 🔒 Security Implementation

### **Authentication Flow**
1. **Registration**: Email verification required before account activation
2. **Login**: JWT token issued upon successful authentication
3. **Token Management**: Stored in AsyncStorage, automatically included in API requests
4. **Password Security**: bcrypt hashing with 10 rounds
5. **Password Reset**: Secure token-based reset via email

### **Authorization Layers**
1. **JWT Middleware**: Validates tokens on protected routes
2. **Row Level Security**: Database-level access control
3. **Role-based Access**: Group admin vs member permissions
4. **File Access**: Secure file URLs with access control

### **Data Protection**
- All passwords hashed with bcrypt
- JWT tokens with reasonable expiration (24h)
- Secure email verification tokens
- Environment variables for sensitive configuration
- HTTPS enforcement in production

---

## 🚀 Deployment Infrastructure

### **AWS EC2 Instance**
- **IP**: 18.213.201.127
- **OS**: Ubuntu Server
- **Domain**: api.macroscope.info
- **SSL**: HTTPS configured via Let's Encrypt or AWS Certificate Manager
- **Process Manager**: PM2 with ecosystem configuration

### **PM2 Configuration**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'macroscope-backend',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true
  }]
};
```

### **Service Architecture**
```bash
# PM2 process management
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Logs monitoring
pm2 logs macroscope-backend
pm2 monit
```

---

## ⚙️ Configuration Management

### **Environment Variables**
```bash
# Production (.env on EC2)
NODE_ENV=production
PORT=3000
JWT_SECRET=your-secure-jwt-secret

# Supabase
SUPABASE_URL=https://ipaquntaeftocyvxoawo.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AWS SES
EMAIL_PROVIDER=ses
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
SES_FROM_EMAIL=noreply@macroscope.info
SES_FROM_NAME=MacroScope
```

### **Frontend Configuration**
```typescript
// src/config.ts
export const API_URL = getApiUrl();

function getApiUrl() {
  if (__DEV__) {
    return Platform.select({
      ios: 'http://localhost:3000/api',
      android: 'http://10.0.2.2:3000/api',
      default: 'http://10.0.0.170:3000/api' // Your local IP
    });
  } else {
    return 'https://api.macroscope.info/api';
  }
}
```

---

## 📁 File System Structure

### **Directory Layout**
```
/research_group/
├── ResearchCoordinatorApp/          # React Native frontend
├── backend/                         # Express.js backend
├── *.sql                           # Database schema files
├── *.md                            # Documentation files
├── APP_STORE_SUBMISSION_CHECKLIST.md
├── CREDENTIALS_AND_ACCESS.md        # (gitignored)
└── INFRASTRUCTURE_DOCUMENTATION.md # (this file)
```

### **Key Files**
- **Backend Entry**: `backend/src/index.ts`
- **Frontend Entry**: `ResearchCoordinatorApp/App.tsx`
- **API Service**: `ResearchCoordinatorApp/src/services/api.ts`
- **Database Config**: `backend/src/config/database.ts`
- **PM2 Config**: `backend/ecosystem.config.js`

---

## 🔧 Common Tasks

### **Development Setup**
```bash
# Backend development
cd backend
npm install
npm run dev

# Frontend development
cd ResearchCoordinatorApp
npm install
npx expo start
```

### **Production Deployment**
```bash
# SSH into EC2
ssh -i ~/Downloads/macroscope-key.pem ec2-user@18.213.201.127

# Update backend code
cd macroscope/backend
git pull origin main
npm install
npm run build
pm2 restart macroscope-backend --update-env
```

### **Database Operations**
```sql
-- Connect to Supabase via dashboard or CLI
-- Check user registrations
SELECT email, email_verified, created_at FROM users ORDER BY created_at DESC;

-- Check active groups
SELECT g.name, u.username as creator, g.created_at 
FROM groups g 
JOIN users u ON g.created_by = u.id;

-- Monitor file uploads
SELECT pf.filename, pf.file_size, u.username, pf.uploaded_at
FROM project_files pf
JOIN users u ON pf.uploaded_by = u.id
ORDER BY pf.uploaded_at DESC;
```

### **Monitoring & Debugging**
```bash
# Check application logs
pm2 logs macroscope-backend

# Monitor system resources
pm2 monit

# Check process status
pm2 status

# Restart if needed
pm2 restart macroscope-backend
```

### **Email Service Testing**
```bash
# Test SES configuration
node -e "
require('dotenv').config();
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const ses = new SESClient({ region: 'us-east-1' });
// Test email sending logic
"
```

---

## 📊 Performance Considerations

### **Database Optimization**
- Proper indexing on frequently queried columns
- Efficient JOIN operations
- Connection pooling via Supabase

### **File Upload Strategy**
- 50MB file size limit
- Base64 encoding for uploads
- Supabase Storage for file management
- Metadata tracking in PostgreSQL

### **Frontend Performance**
- Image caching and optimization
- Lazy loading of project data
- AsyncStorage for offline persistence
- Optimized re-renders with proper state management

---

## 🔄 Integration Points

### **External Services**
1. **Supabase**: Database, authentication, file storage
2. **AWS SES**: Transactional email delivery
3. **Expo**: Mobile app development platform

### **Deep Linking**
- Email verification: `macroscope://login?verified=true&email=user@example.com`
- Password reset: `macroscope://login?reset=success&email=user@example.com`

### **File Upload Flow**
1. User selects file in mobile app
2. File converted to base64
3. POST request to `/api/projects/:id/files`
4. Backend uploads to Supabase Storage
5. File metadata stored in database
6. Public URL returned to client

---

## 📝 Developer Notes

### **Code Conventions**
- TypeScript for type safety
- Consistent naming conventions (camelCase for variables, PascalCase for components)
- Comprehensive error handling with user-friendly messages
- Environment-specific configurations

### **Testing Strategy**
- Manual testing on physical devices
- Automated testing recommended for future development
- API endpoint testing with tools like Postman

### **Future Enhancements**
- Real-time updates via WebSocket
- Push notifications
- Comprehensive offline support
- Automated testing suite
- API documentation with OpenAPI/Swagger

---

*This documentation should provide future Claude instances with comprehensive understanding of the MacroScope application infrastructure, architecture patterns, and operational procedures.*

*Last Updated: August 6, 2025*