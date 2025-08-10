# Research Coordinator Application - Priority Fixes

## Critical Issues to Address

### 1. ✅ Consolidate Duplicate Route Files [COMPLETED]
**Priority**: Critical  
**Location**: `/backend/src/routes/`  
**Issue**: Multiple versions of the same routes exist (groups.ts, groups-temp.ts, groups-full.ts, groups-demo.ts)  
**Action Completed**:
- [x] Identified the correct/latest version of each route file (groups.ts, auth.ts, users.ts, projects.ts)
- [x] Deleted redundant files (groups-temp.ts, groups-full.ts)
- [x] Moved demo files to separate /demo directory for clarity
- [x] Updated imports in index.ts
- [x] Tested build and server startup - all working

**Files to Review**:
- `groups.ts` vs `groups-temp.ts` vs `groups-full.ts` vs `groups-demo.ts`
- `auth.ts` vs `auth-demo.ts`
- `users.ts` vs `users-demo.ts`
- `projects.ts` vs `projects-demo.ts`

---

### 2. ❌ Clarify Backend Server Role
**Priority**: Critical  
**Issue**: The app connects directly to Supabase for most operations, making the backend optional and creating confusion  
**Action Required**:
- [ ] Document which operations require the backend server
- [ ] Consider moving all operations to either:
  - Option A: Route everything through the backend (recommended for consistency)
  - Option B: Use Supabase directly for everything (simpler architecture)
- [ ] Update the frontend to use a consistent approach
- [ ] Add clear error messages when backend is required but not running

**Current Backend-Only Operations**:
- File uploads to local storage
- Complex business logic that can't be done in RLS policies
- Email sending (if implemented)

---

### 3. ❌ Enable Email Verification
**Priority**: High  
**Location**: `/backend/src/routes/auth.ts` and `/ResearchCoordinatorApp/src/services/supabaseService.ts`  
**Issue**: Email verification is disabled (emailRedirectTo: undefined)  
**Action Required**:
- [ ] Enable email verification in Supabase dashboard
- [ ] Update registration endpoint to require email verification
- [ ] Add email verification redirect URL
- [ ] Implement email verification screen flow in the app
- [ ] Add resend verification email functionality
- [ ] Prevent login until email is verified

**Code Locations**:
- Backend: `/backend/src/routes/auth.ts` line ~156
- Frontend: `/ResearchCoordinatorApp/src/services/supabaseService.ts` line ~19

---

### 4. ❌ Implement Rate Limiting
**Priority**: High  
**Issue**: API endpoints have no rate limiting, vulnerable to abuse  
**Action Required**:
- [ ] Install rate limiting middleware (express-rate-limit)
- [ ] Configure rate limits for each endpoint type:
  - Authentication endpoints: 5 requests per minute
  - Read endpoints: 100 requests per minute
  - Write endpoints: 30 requests per minute
  - File uploads: 10 requests per minute
- [ ] Add rate limit headers to responses
- [ ] Implement user-specific rate limits using JWT user ID
- [ ] Add rate limit bypass for admin users (optional)

**Suggested Package**: `express-rate-limit`

---

## Completion Tracking

- **Started**: [Date when work begins]
- **Target Completion**: [Set a realistic deadline]
- **Completed**: [Date when all items are done]

## Notes

- Test thoroughly after each fix
- Create backups before making major changes
- Document any decisions or changes made
- Update INFRASTRUCTURE_DOCUMENTATION.md after fixes are complete