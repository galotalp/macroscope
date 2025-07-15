# Research Coordinator App

A React Native application for researchers to coordinate their research projects, built with Expo, Node.js backend, and Supabase database.

## Features

### User Management
- User registration and authentication
- Profile management with bio and profile pictures
- JWT-based authentication system

### Research Groups
- Create and manage research groups
- Join existing research groups
- Group membership management
- Owner permissions for group deletion

### Project Management
- Create projects within research groups
- Assign users to projects
- Track project progress with customizable checklists
- Project status tracking (Planning, In Progress, Completed, On Hold)

### File Management
- Upload and manage project files
- File sharing within project teams

## Technology Stack

### Frontend
- **React Native** with Expo
- **TypeScript** for type safety
- **React Native Paper** for Material Design components
- **AsyncStorage** for local data persistence

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **JWT** for authentication
- **bcrypt** for password hashing
- **Multer** for file uploads

### Database
- **Supabase** (PostgreSQL)
- Row Level Security (RLS) policies
- Structured relational data model

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Supabase account

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   SUPABASE_URL=your-supabase-url
   SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Set up your Supabase database:
   - Create a new Supabase project
   - Run the SQL commands from `database_schema.sql` in the Supabase SQL editor
   - Update your `.env` file with the Supabase URL and anon key

5. Build and start the backend:
   ```bash
   npm run build
   npm start
   ```

   For development:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the React Native app directory:
   ```bash
   cd ResearchCoordinatorApp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Update the API base URL in `src/services/api.ts` if needed (default is `http://localhost:3000/api`)

4. Start the Expo development server:
   ```bash
   npx expo start
   ```

5. Use the Expo Go app on your phone or run on an emulator

## Database Schema

The application uses a relational database with the following main tables:

- **users**: User accounts and profiles
- **research_groups**: Research group information
- **research_group_members**: Group membership with roles
- **projects**: Project information and status
- **project_assignments**: User assignments to projects
- **project_checklist**: Project progress tracking
- **project_files**: File attachments for projects

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/profile-picture` - Upload profile picture

### Research Groups
- `GET /api/groups` - Get user's research groups
- `POST /api/groups` - Create new research group
- `POST /api/groups/:id/join` - Join research group
- `DELETE /api/groups/:id` - Delete research group (owner only)
- `GET /api/groups/:id/members` - Get group members

### Projects
- `GET /api/projects/group/:groupId` - Get projects for a group
- `POST /api/projects/group/:groupId` - Create new project
- `POST /api/projects/:id/assign` - Assign user to project
- `POST /api/projects/:id/checklist` - Add checklist item
- `PUT /api/projects/:id/checklist/:itemId` - Update checklist item
- `POST /api/projects/:id/files` - Upload project file

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Row Level Security (RLS) policies in Supabase
- Input validation and sanitization
- CORS configuration

## Development

### Backend Development
- Run `npm run dev` for development with auto-restart
- TypeScript compilation with `npm run build`
- All routes are protected with authentication middleware

### Frontend Development
- Use `npx expo start` for development
- TypeScript support with proper type definitions
- Material Design components with React Native Paper

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
