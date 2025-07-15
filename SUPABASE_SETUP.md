# Supabase Database Setup Instructions

The backend is now connecting to Supabase but the database schema needs to be applied. Follow these steps:

## Step 1: Access Supabase Dashboard
1. Go to [Supabase Dashboard](https://app.supabase.com/projects)
2. Find your project: `ipaquntaeftocyvxoawo`
3. Click on your project to open it

## Step 2: Open SQL Editor
1. In the left sidebar, click on "SQL Editor"
2. Click on "New query" or use the existing editor

## Step 3: Apply Database Schema
1. Copy the entire contents of `database_schema.sql` from this project
2. Paste it into the SQL Editor
3. Click "Run" to execute the schema

## Step 4: Verify Tables Were Created
After running the schema, you should see these tables in the Table Editor:
- `users` (with columns: id, username, email, password_hash, bio, profile_picture, created_at, updated_at)
- `groups` (with columns: id, name, description, created_by, created_at, updated_at)
- `group_memberships` (linking users to groups)
- `projects` (with columns: id, name, description, group_id, created_by, status, created_at, updated_at)
- `project_assignments` (linking users to projects)
- `project_files` (for file uploads)
- `checklists` (for project progress tracking)
- `checklist_items` (individual checklist items)

## Step 5: Test the Backend
After applying the schema, test the registration endpoint:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@example.com", "password": "password123"}'
```

## Alternative: Drop and Recreate Tables
If you have existing tables that conflict, you can add this to the beginning of the schema:
```sql
-- Drop existing tables (WARNING: This will delete all data!)
DROP TABLE IF EXISTS checklist_items CASCADE;
DROP TABLE IF EXISTS checklists CASCADE;
DROP TABLE IF EXISTS project_files CASCADE;
DROP TABLE IF EXISTS project_assignments CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS group_memberships CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

## What's Next
Once the schema is applied:
1. The backend will work with the real Supabase database
2. You can test registration and login
3. You can create groups and projects
4. File uploads will work
5. The frontend app will connect to the real database
