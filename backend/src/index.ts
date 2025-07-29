import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase, isDemoMode } from './config/database';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


// Serve static files for uploaded images
app.use('/uploads', express.static('uploads'));

export { supabase, isDemoMode };

// Import routes after supabase client is created
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import groupRoutes from './routes/groups';
import projectRoutes from './routes/projects';

console.log('Routes imported successfully');

// Demo routes (fallback)
import authDemoRoutes from './routes/auth-demo';
import userDemoRoutes from './routes/users-demo';
import groupDemoRoutes from './routes/groups-demo';
import projectDemoRoutes from './routes/projects-demo';

// Routes - use real Supabase routes if available, otherwise demo routes
if (isDemoMode) {
  console.log('🔧 Using demo routes (no database persistence)');
  app.use('/api/auth', authDemoRoutes);
  app.use('/api/users', userDemoRoutes);
  app.use('/api/groups', groupDemoRoutes);
  app.use('/api/projects', projectDemoRoutes);
} else {
  console.log('🗄️  Using Supabase routes (full database functionality)');
  console.log('Registering auth routes...');
  app.use('/api/auth', authRoutes);
  console.log('Registering users routes...');
  app.use('/api/users', userRoutes);
  console.log('Users routes mounted at /api/users');
  console.log('Registering groups routes...');
  app.use('/api/groups', groupRoutes);
  console.log('Registering projects routes...');
  app.use('/api/projects', projectRoutes);
}

app.get('/', (req, res) => {
  res.json({ 
    message: 'Research Coordinator API is running!',
    demoMode: isDemoMode,
    databaseStatus: isDemoMode ? 'Demo mode - in-memory data' : 'Connected to Supabase'
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
