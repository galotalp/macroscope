<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Research Coordinator App - Copilot Instructions

This is a React Native application for researchers to coordinate their research projects. The app includes:

## Architecture
- **Frontend**: React Native with Expo and TypeScript
- **Backend**: Node.js with Express and TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT tokens with bcrypt password hashing

## Key Features
1. **User Management**: Registration, login, profile management with bio and profile pictures
2. **Research Groups**: Create, join, and manage research groups
3. **Projects**: Create projects within groups, assign users, track progress
4. **File Management**: Upload and manage project files
5. **Checklists**: Track project progress through customizable checklists

## Project Structure
- `ResearchCoordinatorApp/` - React Native frontend
  - `src/screens/` - Screen components
  - `src/services/` - API service layer
  - `src/types/` - TypeScript type definitions
  - `src/components/` - Reusable components
- `backend/` - Node.js backend
  - `src/routes/` - API route handlers
  - `src/middleware/` - Authentication middleware
- `database_schema.sql` - Database schema with RLS policies

## Technologies Used
- React Native with Expo
- React Native Paper (Material Design components)
- Supabase for database and authentication
- Express.js for backend API
- TypeScript for type safety
- JWT for authentication
- Multer for file uploads

## Development Guidelines
- Use TypeScript for all new code
- Follow React Native best practices
- Use React Native Paper components for consistent UI
- Implement proper error handling and user feedback
- Use async/await for all API calls
- Implement proper authentication checks for protected routes
