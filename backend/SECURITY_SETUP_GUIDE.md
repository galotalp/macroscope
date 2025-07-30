# Comprehensive Security Setup Guide

## 1. Environment Variables Setup

Add this to your `.env` file:

```env
# Existing variables
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key

# NEW: Add service role key for backend operations
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Where to find your Service Role Key:**
1. Go to your Supabase dashboard
2. Navigate to Settings > API
3. Copy the `service_role` key (NOT the anon key)
4. This key bypasses RLS and is only for server-side use

## 2. Database Security Implementation

### Step 1: Run the RLS Security Script
Execute `comprehensive_rls_security.sql` in your Supabase SQL Editor.

This script will:
- ✅ Enable RLS on all tables (fixes security warnings)
- ✅ Create proper security policies based on your data relationships
- ✅ Allow your backend API to continue working via service role
- ✅ Block unauthorized direct database access

### Step 2: Update Your Backend Configuration

Replace your `database.ts` content with the pattern from `supabase_service_role_setup.js`:

**Key Changes:**
- Use `supabaseAdmin` (service role) for all backend database operations
- Keep `supabase` (anon key) for any client-side operations (if needed)
- Service role bypasses RLS, so your existing backend code will work

### Step 3: Update Database Operations in Routes

In your route files, replace `supabase` with `supabaseAdmin`:

```typescript
// OLD
const { data, error } = await supabase
  .from('users')
  .select('*');

// NEW  
const { data, error } = await supabaseAdmin
  .from('users')
  .select('*');
```

## 3. Security Policy Overview

The implemented policies provide:

### **Users Table**
- ✅ Users can view/edit their own profile
- ✅ Backend API has full access via service role
- ❌ Users cannot access other users' sensitive data directly

### **Groups & Group Memberships**
- ✅ Members can view groups they belong to
- ✅ Members can see other members of their groups
- ❌ Users cannot see groups they're not members of

### **Projects & Project Assignments**
- ✅ Group members can view projects in their groups
- ✅ Project members can be assigned/removed by other project members
- ❌ Non-group members cannot see projects

### **Checklists & Checklist Items**
- ✅ Project members can view and modify checklist items
- ❌ Non-project members cannot access checklists

### **Project Files**
- ✅ Group members can view project files
- ✅ Project members can upload/delete files
- ❌ Non-group members cannot access files

## 4. Testing the Security

After implementation:

1. **Test Backend API**: All your existing endpoints should work normally
2. **Test Direct DB Access**: Try accessing data directly via Supabase dashboard - it should be restricted based on user context
3. **Run Security Test**: Execute in SQL Editor:
   ```sql
   SELECT auth.test_security();
   ```

## 5. Benefits of This Implementation

- 🔒 **Zero Trust Security**: Users can only access data they're authorized to see
- 🚀 **Backward Compatible**: Your existing backend API continues to work
- 🛡️ **Defense in Depth**: Multiple layers of security (RLS + API + JWT)
- 📊 **Audit Ready**: All data access is logged and traceable
- 🔄 **Scalable**: Policies automatically apply to new data

## 6. Monitoring & Maintenance

- Monitor your Supabase dashboard for any new security warnings
- Regularly review access logs in Supabase
- Update policies as your application evolves
- Test security after any schema changes

## 7. Emergency Rollback

If something goes wrong, you can temporarily disable RLS:

```sql
-- Emergency disable (use only if absolutely necessary)
ALTER TABLE public.table_name DISABLE ROW LEVEL SECURITY;
```

Then investigate and fix the issue before re-enabling.

---

**⚠️ Important Notes:**
- Keep your service role key secure - never expose it to the client
- Test thoroughly in a staging environment first
- The service role key has full database access, so guard it carefully
- RLS policies are enforced for all non-service-role connections