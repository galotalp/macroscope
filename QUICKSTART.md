# Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Supabase account

### 1. Setup Supabase Database

1. Go to [Supabase](https://supabase.com) and create a new project
2. In the SQL editor, run all the commands from `database_schema.sql`
3. Go to Settings → API to get your URL and anon key

### 2. Configure Backend

1. Navigate to the backend directory: `cd backend`
2. Copy the environment file: `cp .env.example .env`
3. Update `.env` with your Supabase credentials:
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

### 3. Start Backend Server

```bash
cd backend
npm install
npm run dev
```

The server will start on http://localhost:3000

### 4. Start React Native App

```bash
cd ResearchCoordinatorApp
npm install
npx expo start
```

### 5. Test the App

1. Scan the QR code with Expo Go app (iOS/Android)
2. Register a new account
3. Create a research group
4. Create projects and start collaborating!

## 📱 Features Overview

- **User Authentication**: Register, login, profile management
- **Research Groups**: Create, join, and manage research groups
- **Projects**: Create projects, assign users, track progress
- **Checklists**: Track project progress with custom checklists
- **File Management**: Upload and share project files

## 🔧 Development

### Backend Development
- API endpoints for authentication, groups, projects
- JWT authentication with bcrypt password hashing
- File upload support with Multer
- PostgreSQL database with Supabase

### Frontend Development
- React Native with Expo
- TypeScript for type safety
- React Native Paper for UI components
- AsyncStorage for local data persistence

## 🆘 Troubleshooting

### Backend Issues
- Make sure your Supabase URL and key are correct
- Check that all database tables were created successfully
- Verify that the backend server is running on port 3000

### Frontend Issues
- Make sure the API base URL in `src/config.ts` matches your backend URL
- Check that all dependencies are installed correctly
- Verify that Expo CLI is installed globally

## 📚 Documentation

See the main README.md for detailed documentation and API reference.
