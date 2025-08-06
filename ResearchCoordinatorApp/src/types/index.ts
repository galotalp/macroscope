export interface User {
  id: string;
  email: string;
  username: string;
  bio?: string;
  profile_picture?: string;
  created_at: string;
  updated_at?: string;
}

export interface ResearchGroup {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at?: string;
  owner?: User;
}

export interface ResearchGroupMember {
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  users: User;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  research_group_id: string;
  created_by: string;
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  created_at: string;
  updated_at?: string;
  creator?: User;
}

export interface ProjectAssignment {
  id: string;
  project_id: string;
  user_id: string;
  assigned_at: string;
  user?: User;
}

export interface ChecklistItem {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  completed: boolean;
  created_at: string;
  updated_at?: string;
}
