import { supabase } from '../config/supabase'
import { User } from '../types'
import { 
  validateFile, 
  sanitizeFilename, 
  FILE_SECURITY_ERRORS 
} from '../constants/fileUploadSecurity'

class SupabaseService {
  // Auth cache to reduce redundant getUser() calls
  private static userCache: { user: any; expiry: number } | null = null
  private static CACHE_DURATION = 60 * 1000 // 1 minute

  private async getCachedUser() {
    const now = Date.now()
    
    // Return cached user if valid
    if (SupabaseService.userCache && now < SupabaseService.userCache.expiry) {
      return { data: { user: SupabaseService.userCache.user }, error: null }
    }

    // Fetch fresh user data
    const { data, error } = await supabase.auth.getUser()
    
    if (!error && data.user) {
      SupabaseService.userCache = {
        user: data.user,
        expiry: now + SupabaseService.CACHE_DURATION
      }
    }

    return { data, error }
  }

  static clearAuthCache() {
    SupabaseService.userCache = null
  }

  // ==================== AUTH METHODS ====================
  
  async register(email: string, password: string, username: string) {
    try {
      // Registration started
      
      // Sign up user with Supabase Auth (with email confirmation enabled)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          },
          emailRedirectTo: 'https://macroscope.info/verify-email' // Enable email confirmation
        }
      })

      // Auth signup completed

      if (authError) {
        console.error('Auth error details:', authError)
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error('Registration failed - no user data returned')
      }

      // User profile will be created automatically by the database trigger
      
      return {
        message: 'Registration successful! Please check your email to verify your account.',
        requiresVerification: true,
        email: email
      }
    } catch (error: any) {
      console.error('Registration failed:', error?.message)
      
      if (error.message) {
        throw new Error(`Registration failed: ${error.message}`)
      } else {
        throw new Error('Database error saving new user')
      }
    }
  }

  async login(email: string, password: string) {
    try {
      // Login attempt started
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      // Auth response received

      if (error) {
        console.error('Supabase auth error details:', error)
        // Check if it's an email verification error
        if (error.message.includes('Email not confirmed') || error.message.includes('verify')) {
          throw new Error('Please verify your email address before logging in')
        }
        throw new Error(error.message)
      }

      if (!data.user) {
        throw new Error('Login failed - no user data')
      }

      // Get user profile data from users table
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id, username, email, bio, profile_picture')
        .eq('id', data.user.id)
        .single()

      if (profileError) {
        console.error('Error fetching user profile:', profileError)
        // Continue with basic user data if profile fetch fails
      }

      const user: User = {
        id: data.user.id,
        username: userProfile?.username || data.user.user_metadata?.username || 'Unknown',
        email: data.user.email || email,
        bio: userProfile?.bio,
        profile_picture: userProfile?.profile_picture,
        created_at: data.user.created_at
      }

      return {
        message: 'Login successful',
        token: data.session?.access_token, // For compatibility with existing code
        user
      }
    } catch (error: any) {
      console.error('Login error:', error)
      throw error
    }
  }

  async resendVerificationEmail(email: string) {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })

      if (error) {
        throw new Error(error.message)
      }

      return { message: 'Verification email sent successfully!' }
    } catch (error: any) {
      console.error('Resend verification failed:', error)
      throw error
    }
  }

  async checkVerificationStatus(email: string, password: string) {
    try {
      // Try to sign in to check if email is verified
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (!error) {
        // Login successful means email is verified
        await supabase.auth.signOut() // Sign out immediately - we're just checking
        return { isVerified: true }
      }

      // Check if error is related to unverified email
      if (error.message.includes('Email not confirmed')) {
        return { isVerified: false }
      }

      // If it's a different error, throw it
      throw error
    } catch (error: any) {
      throw error
    }
  }

  async logout() {
    try {
      // Clear auth cache before logout
      SupabaseService.clearAuthCache()
      
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error)
      }
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  async forgotPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'macroscope://reset-password' // Deep link back to app
      })

      if (error) {
        throw new Error(error.message)
      }

      return { message: 'Password reset email sent successfully!' }
    } catch (error: any) {
      console.error('Forgot password failed:', error)
      throw error
    }
  }

  // ==================== USER METHODS ====================

  async getUserProfile() {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, username, email, bio, profile_picture, created_at')
        .eq('id', user.id)
        .single()

      if (profileError) {
        throw new Error(profileError.message)
      }

      return { user: profile }
    } catch (error: any) {
      console.error('Error fetching user profile:', error)
      throw error
    }
  }

  async updateProfile(profileData: { bio?: string; profile_picture?: string }) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      const { data, error } = await supabase
        .from('users')
        .update(profileData)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      // Clear auth cache since profile data changed
      SupabaseService.clearAuthCache()
      
      return { user: data }
    } catch (error: any) {
      console.error('Error updating profile:', error)
      throw error
    }
  }

  async uploadProfilePicture(imageUri: string, fileName: string) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // SECURITY: Sanitize filename first
      const sanitizedFileName = sanitizeFilename(fileName)
      const fileExt = sanitizedFileName.split('.').pop() || 'jpg'
      
      // SECURITY: Validate file type for profile pictures
      const mimeType = `image/${fileExt}`
      const validation = validateFile(
        { name: sanitizedFileName, type: mimeType },
        'PROFILE_PICTURE'
      )
      
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid profile picture file')
      }

      // Create secure file path
      const filePath = `${user.id}/profile-${Date.now()}.${fileExt}`
      
      console.log('Uploading profile picture...')

      // Use Supabase's built-in React Native support with FormData
      const formData = new FormData()
      formData.append('file', {
        uri: imageUri,
        name: sanitizedFileName,
        type: mimeType,
      } as any)

      // Upload using Supabase storage
      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, formData, {
          cacheControl: '3600',
          upsert: true,
        })

      if (error) {
        throw new Error(error.message)
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath)

      // Update user profile in database
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ profile_picture: publicUrl })
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) {
        throw new Error(updateError.message)
      }

      // Clear auth cache since profile data changed
      SupabaseService.clearAuthCache()
      
      // Return updated user object for ProfileScreen
      return { 
        user: updatedUser,
        profile_picture: publicUrl 
      }
    } catch (error: any) {
      console.error('Error uploading profile picture:', error)
      throw error
    }
  }

  // ==================== GROUP METHODS ====================

  async getResearchGroups() {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // OPTIMIZED: Single query with member count
      const { data: userGroups, error } = await supabase
        .from('group_memberships')
        .select(`
          groups (
            id,
            name,
            description,
            created_at,
            created_by,
            group_memberships(count)
          )
        `)
        .eq('user_id', user.id)

      if (error) {
        throw new Error(error.message)
      }

      const groups = userGroups?.map((membership: any) => ({
        ...membership.groups,
        member_count: membership.groups.group_memberships[0]?.count || 0
      })) || []
      
      return { groups }
    } catch (error: any) {
      console.error('Error fetching groups:', error)
      throw error
    }
  }

  async createResearchGroup(name: string, description: string) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert([
          { name, description, created_by: user.id }
        ])
        .select()
        .single()

      if (groupError) {
        throw new Error(groupError.message)
      }

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('group_memberships')
        .insert([
          { group_id: group.id, user_id: user.id, role: 'admin' }
        ])

      if (memberError) {
        // Clean up the group if member addition failed
        await supabase.from('groups').delete().eq('id', group.id)
        throw new Error(memberError.message)
      }

      return {
        group,
        message: 'Group created successfully'
      }
    } catch (error: any) {
      console.error('Error creating group:', error)
      throw error
    }
  }

  async getPendingJoinRequestCounts() {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Call the function we defined in the migration SQL
      const { data, error } = await supabase.rpc('get_pending_join_requests_count')

      if (error) {
        throw new Error(error.message)
      }

      // Transform to match expected format
      const totalPendingRequests = data?.reduce((total: number, group: any) => total + group.pending_count, 0) || 0
      const groupCounts = data?.map((group: any) => ({
        groupId: group.group_id,
        groupName: group.group_name,
        pendingRequestsCount: group.pending_count
      })) || []

      return {
        totalPendingRequests,
        groupCounts
      }
    } catch (error: any) {
      console.error('Error fetching pending join requests:', error)
      throw error
    }
  }

  // ==================== PROJECT METHODS ====================

  async getProjects(groupId: string) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // OPTIMIZED: Get projects with basic counts
      const { data: projects, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_files(count),
          project_members(count),
          project_checklist_items(count),
          groups!inner(
            group_memberships!inner(user_id)
          )
        `)
        .eq('group_id', groupId)
        .eq('groups.group_memberships.user_id', user.id)
        .order('created_at', { ascending: false })
        
      if (error) {
        throw new Error(error.message)
      }

      // Get detailed data for all projects in parallel
      const projectIds = projects?.map(p => p.id) || []
      
      const [membersData, checklistData] = await Promise.all([
        // Get member usernames for all projects
        supabase
          .from('project_members')
          .select('project_id, users!user_id(username)')
          .in('project_id', projectIds),
        // Get checklist completion status for all projects
        supabase
          .from('project_checklist_items')
          .select('project_id, completed')
          .in('project_id', projectIds)
      ])

      if (membersData.error || checklistData.error) {
        throw new Error(membersData.error?.message || checklistData.error?.message || 'Failed to fetch project details')
      }

      // Process projects to include all data that ProjectsScreen needs
      const processedProjects = projects?.map(project => {
        // Get checklist data for this project
        const projectChecklistItems = checklistData.data?.filter(item => item.project_id === project.id) || []
        const completedTasks = projectChecklistItems.filter(item => item.completed).length
        const totalTasks = projectChecklistItems.length

        // Get member names for this project
        const projectMembers = membersData.data?.filter(member => member.project_id === project.id) || []
        const assignedMembers = projectMembers
          .map((member: any) => member.users?.username)
          .filter(Boolean)

        return {
          ...project,
          file_count: project.project_files?.[0]?.count || 0,
          member_count: project.project_members?.[0]?.count || 0,
          checklist_count: project.project_checklist_items?.[0]?.count || 0,
          // Add the data ProjectsScreen needs
          completedTasks,
          totalTasks,
          assignedMembers,
          // Remove nested objects we don't need
          project_files: undefined,
          project_members: undefined,
          project_checklist_items: undefined,
          groups: undefined
        }
      }) || []

      // Sort by priority (moved client-side for better performance)
      const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 }
      const sortedProjects = processedProjects.sort((a, b) => {
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority
        }
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      return { projects: sortedProjects }
    } catch (error: any) {
      console.error('Error fetching projects:', error)
      throw error
    }
  }

  async createProject(data: {
    name: string;
    description: string;
    groupId: string;
    priority?: string;
    notes?: string;
    memberIds?: string[];
  }) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Verify user is a member of the group
      const { data: membership, error: membershipError } = await supabase
        .from('group_memberships')
        .select('*')
        .eq('group_id', data.groupId)
        .eq('user_id', user.id)
        .single()

      if (membershipError || !membership) {
        throw new Error('Access denied - you are not a member of this group')
      }

      // Create the project
      // The database trigger will automatically add the creator as an admin member
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([
          {
            name: data.name,
            description: data.description,
            group_id: data.groupId,
            priority: data.priority || 'medium',
            notes: data.notes,
            created_by: user.id
          }
        ])
        .select()
        .single()

      if (projectError) {
        throw new Error(projectError.message)
      }

      // The database trigger automatically adds the creator as an admin member
      // Now add any additional selected members
      if (data.memberIds && data.memberIds.length > 0) {
        // Filter out the creator (already added by trigger) and add other members
        const additionalMemberIds = data.memberIds.filter(memberId => memberId !== user.id)
        
        if (additionalMemberIds.length > 0) {
          // Verify all users are members of the same group
          const { data: groupMembers } = await supabase
            .from('group_memberships')
            .select('user_id')
            .eq('group_id', data.groupId)
            .in('user_id', additionalMemberIds)

          const validMemberIds = groupMembers?.map(gm => gm.user_id) || []
          
          if (validMemberIds.length > 0) {
            // Add all valid members to the project
            const projectMembers = validMemberIds.map(userId => ({
              project_id: project.id,
              user_id: userId,
              role: 'member',
              added_by: user.id
            }))

            const { error: membersError } = await supabase
              .from('project_members')
              .insert(projectMembers)

            if (membersError) {
              console.error('Error adding project members:', membersError)
              // Don't fail the entire project creation, just log the error
            }
          }
        }
      }

      // No longer automatically copy group default checklist items here
      // The Create Project screen handles this by allowing users to customize 
      // the checklist items before creating the project

      return {
        project,
        message: 'Project created successfully'
      }
    } catch (error: any) {
      console.error('Error creating project:', error)
      throw error
    }
  }

  async getProjectDetails(projectId: string) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // SINGLE OPTIMIZED QUERY: Get everything at once!
      const { data: projectData, error } = await supabase
        .from('projects')
        .select(`
          *,
          groups!inner(
            id,
            name,
            group_memberships!inner(user_id)
          ),
          project_members(
            role,
            users!user_id (
              id,
              username,
              email,
              profile_picture
            )
          ),
          project_checklist_items(
            id,
            title,
            description,
            completed,
            created_by,
            created_at,
            updated_at
          ),
          project_files(
            id,
            filename,
            original_name,
            file_size,
            mime_type,
            public_url,
            uploaded_at,
            users!uploaded_by (
              id,
              username,
              email
            )
          )
        `)
        .eq('id', projectId)
        .eq('groups.group_memberships.user_id', user.id)
        .single()

      if (error || !projectData) {
        throw new Error('Project not found or access denied')
      }

      // Format members to match frontend expectations
      const members = projectData.project_members?.map((pm: any) => ({
        users: pm.users,
        role: pm.role
      })) || []

      return { 
        project: {
          ...projectData,
          project_members: undefined,
          project_checklist_items: undefined,
          project_files: undefined,
          groups: undefined
        },
        members,
        checklist: projectData.project_checklist_items || [],
        files: projectData.project_files || []
      }
    } catch (error: any) {
      console.error('Error fetching project details:', error)
      throw error
    }
  }

  async getProjectMembers(groupId: string) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Get members of the group
      const { data: members, error } = await supabase
        .from('group_memberships')
        .select(`
          users (
            id,
            username,
            email,
            profile_picture
          )
        `)
        .eq('group_id', groupId)

      if (error) {
        throw new Error(error.message)
      }

      const users = members?.map((membership: any) => membership.users) || []
      return { members: users }
    } catch (error: any) {
      console.error('Error fetching project members:', error)
      throw error
    }
  }

  async updateProject(projectId: string, data: {
    name?: string;
    description?: string;
    priority?: string;
    notes?: string;
  }) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Update the project - RLS policies will handle access control
      const { data: updatedProject, error: updateError } = await supabase
        .from('projects')
        .update(data)
        .eq('id', projectId)
        .select()
        .single()

      if (updateError) {
        if (updateError.message.includes('permission') || updateError.code === '42501') {
          throw new Error('Access denied - you do not have permission to update this project')
        }
        throw new Error(updateError.message)
      }

      return updatedProject
    } catch (error: any) {
      console.error('Error updating project:', error)
      throw error
    }
  }

  async deleteProject(projectId: string) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // First check if the project exists and if the user is the creator
      const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select('id, created_by, name')
        .eq('id', projectId)
        .single()

      if (fetchError || !project) {
        throw new Error('Project not found')
      }

      // Check if the user is the project creator
      if (project.created_by !== user.id) {
        throw new Error('Access denied - only project creators can delete projects')
      }

      // Now try to delete - we know the user has permission
      const { error: deleteError, count } = await supabase
        .from('projects')
        .delete({ count: 'exact' })
        .eq('id', projectId)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      // Double-check that something was actually deleted
      if (count === 0) {
        throw new Error('Project could not be deleted')
      }

      return { message: 'Project deleted successfully' }
    } catch (error: any) {
      console.error('Error deleting project:', error)
      throw error
    }
  }

  // ==================== GROUP MANAGEMENT METHODS ====================

  async getGroupDetails(groupId: string) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Verify user is a member of the group
      const { data: membership, error: membershipError } = await supabase
        .from('group_memberships')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single()

      if (membershipError || !membership) {
        throw new Error('Access denied - you are not a member of this group')
      }

      // Get group details with members and join requests (for admins)
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single()

      if (groupError || !group) {
        throw new Error('Group not found')
      }

      // Get members
      const { data: members, error: membersError } = await supabase
        .from('group_memberships')
        .select(`
          id,
          role,
          created_at,
          joined_at,
          users (
            id,
            username,
            email,
            profile_picture
          )
        `)
        .eq('group_id', groupId)

      if (membersError) {
        throw new Error(membersError.message)
      }

      // Get join requests if user is admin
      let joinRequests = []
      if (membership.role === 'admin') {
        const { data: requests, error: requestsError } = await supabase
          .from('group_join_requests')
          .select(`
            id,
            status,
            requested_at,
            users (
              id,
              username,
              email,
              profile_picture
            )
          `)
          .eq('group_id', groupId)
          .eq('status', 'pending')

        if (requestsError) {
          console.error('Error fetching join requests:', requestsError)
        } else {
          joinRequests = requests || []
        }
      }

      return {
        group,
        members: members || [],
        joinRequests,
        isAdmin: membership.role === 'admin'
      }
    } catch (error: any) {
      console.error('Error fetching group details:', error)
      throw error
    }
  }

  async respondToJoinRequest(groupId: string, requestId: string, action: 'approve' | 'reject') {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Call the function we defined in the migration SQL
      const { data, error } = await supabase.rpc('respond_to_join_request', {
        request_id: requestId,
        action: action === 'approve' ? 'approved' : 'rejected'
      })

      if (error) {
        throw new Error(error.message)
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      return data
    } catch (error: any) {
      console.error('Error responding to join request:', error)
      throw error
    }
  }

  async removeMemberFromGroup(groupId: string, userId: string) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Verify user is admin of the group
      const { data: membership, error: membershipError } = await supabase
        .from('group_memberships')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single()

      if (membershipError || !membership || membership.role !== 'admin') {
        throw new Error('Access denied - you must be a group admin')
      }

      // Remove the member
      const { error: removeError, count } = await supabase
        .from('group_memberships')
        .delete({ count: 'exact' })
        .eq('group_id', groupId)
        .eq('user_id', userId)

      if (removeError) {
        throw new Error(removeError.message)
      }

      if (count === 0) {
        throw new Error('Member not found or could not be removed')
      }

      // Also remove the user from all projects in this group
      // First get all project IDs in this group
      const { data: groupProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('group_id', groupId)

      if (groupProjects && groupProjects.length > 0) {
        const projectIds = groupProjects.map(p => p.id)
        
        const { error: projectRemovalError } = await supabase
          .from('project_members')
          .delete()
          .eq('user_id', userId)
          .in('project_id', projectIds)

        if (projectRemovalError) {
          console.error('Warning: Failed to remove user from group projects:', projectRemovalError)
          // Don't fail the entire operation - the group removal was successful
        }
      }

      return { message: 'Member removed successfully' }
    } catch (error: any) {
      console.error('Error removing member:', error)
      throw error
    }
  }

  async updateResearchGroup(groupId: string, data: { name?: string; description?: string }) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Verify user is admin of the group
      const { data: membership, error: membershipError } = await supabase
        .from('group_memberships')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single()

      if (membershipError || !membership || membership.role !== 'admin') {
        throw new Error('Access denied - you must be a group admin')
      }

      // Update the group
      const { data: updatedGroup, error: updateError } = await supabase
        .from('groups')
        .update(data)
        .eq('id', groupId)
        .select()
        .single()

      if (updateError) {
        throw new Error(updateError.message)
      }

      return updatedGroup
    } catch (error: any) {
      console.error('Error updating group:', error)
      throw error
    }
  }

  async deleteResearchGroup(groupId: string) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Verify user is admin of the group
      const { data: membership, error: membershipError } = await supabase
        .from('group_memberships')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single()

      if (membershipError || !membership || membership.role !== 'admin') {
        throw new Error('Access denied - you must be a group admin')
      }

      // Delete the group (CASCADE will handle memberships, projects, etc.)
      const { error: deleteError } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      return { message: 'Group deleted successfully' }
    } catch (error: any) {
      console.error('Error deleting group:', error)
      throw error
    }
  }

  async searchGroups(query: string) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Get user's current groups to exclude them from search results
      const { data: userGroupIds } = await supabase
        .from('group_memberships')
        .select('group_id')
        .eq('user_id', user.id)

      const memberGroupIds = userGroupIds?.map(g => g.group_id) || []

      // Build the query
      let searchQuery = supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          invite_code,
          created_at,
          created_by
        `)
        .or(`name.ilike.%${query}%,invite_code.ilike.%${query}%`)
        .limit(20)

      // Only add the NOT IN clause if user has memberships
      if (memberGroupIds.length > 0) {
        searchQuery = searchQuery.not('id', 'in', `(${memberGroupIds.join(',')})`)
      }

      const { data: groups, error } = await searchQuery

      if (error) {
        throw new Error(error.message)
      }

      return { groups: groups || [] }
    } catch (error: any) {
      console.error('Error searching groups:', error)
      throw error
    }
  }

  async getAvailableGroups() {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Get user's current groups to exclude them
      const { data: userGroupIds } = await supabase
        .from('group_memberships')
        .select('group_id')
        .eq('user_id', user.id)

      const memberGroupIds = userGroupIds?.map(g => g.group_id) || []

      // Build the query
      let groupsQuery = supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          invite_code,
          created_at,
          created_by
        `)
        .limit(50)

      // Only add the NOT IN clause if user has memberships
      if (memberGroupIds.length > 0) {
        groupsQuery = groupsQuery.not('id', 'in', `(${memberGroupIds.join(',')})`)
      }

      const { data: groups, error } = await groupsQuery

      if (error) {
        throw new Error(error.message)
      }

      return { groups: groups || [] }
    } catch (error: any) {
      console.error('Error fetching available groups:', error)
      throw error
    }
  }

  async requestToJoinGroup(groupId: string) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Check if user is already a member
      const { data: existingMembership, error: membershipError } = await supabase
        .from('group_memberships')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single()

      if (!membershipError && existingMembership) {
        throw new Error('You are already a member of this group')
      }

      // Check if user already has a pending request
      const { data: existingRequest, error: requestError } = await supabase
        .from('group_join_requests')
        .select('id, status')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single()

      if (!requestError && existingRequest) {
        if (existingRequest.status === 'pending') {
          throw new Error('You already have a pending join request for this group')
        }
      }

      // Create join request
      const { data: request, error: createError } = await supabase
        .from('group_join_requests')
        .insert([{
          group_id: groupId,
          user_id: user.id,
          status: 'pending'
        }])
        .select()
        .single()

      if (createError) {
        throw new Error(createError.message)
      }

      return { message: 'Join request sent successfully' }
    } catch (error: any) {
      console.error('Error requesting to join group:', error)
      throw error
    }
  }

  async changePassword(currentPassword: string, newPassword: string) {
    try {
      // Simply update the password - Supabase handles validation internally
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        throw new Error(updateError.message)
      }

      return { 
        message: 'Password changed successfully',
        user: updateData?.user
      }
    } catch (error: any) {
      console.error('Error changing password:', error)
      throw new Error(error.message || 'Failed to change password')
    }
  }

  // Add a method to refresh user data explicitly
  async refreshUserData() {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Get fresh user profile
      const userProfile = await this.getUserProfile()
      
      return {
        user: userProfile.user,
        authenticated: true
      }
    } catch (error: any) {
      console.error('Error refreshing user data:', error)
      throw error
    }
  }

  // ==================== CHECKLIST METHODS ====================

  async addChecklistItem(projectId: string, title: string, description?: string) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Get project info
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, group_id')
        .eq('id', projectId)
        .single()

      if (projectError || !project) {
        throw new Error('Project not found')
      }

      // Check if user is member of the group
      const { data: membership, error: memberError } = await supabase
        .from('group_memberships')
        .select('id')
        .eq('group_id', project.group_id)
        .eq('user_id', user.id)
        .single()

      if (memberError || !membership) {
        throw new Error('Access denied - you are not a member of this project\'s group')
      }

      // Create checklist item
      const { data: checklistItem, error: createError } = await supabase
        .from('project_checklist_items')
        .insert([{
          project_id: projectId,
          title,
          description,
          created_by: user.id
        }])
        .select()
        .single()

      if (createError) {
        throw new Error(createError.message)
      }

      return checklistItem
    } catch (error: any) {
      console.error('Error adding checklist item:', error)
      throw error
    }
  }

  async updateChecklistItem(projectId: string, itemId: string, data: {
    title?: string;
    description?: string;
    completed?: boolean;
  }) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Update checklist item - RLS policies will handle access control
      const updateData = { ...data, updated_at: new Date().toISOString() }
      const { data: updatedItem, error: updateError } = await supabase
        .from('project_checklist_items')
        .update(updateData)
        .eq('id', itemId)
        .eq('project_id', projectId)
        .select()
        .single()

      if (updateError) {
        if (updateError.message.includes('permission') || updateError.code === '42501') {
          throw new Error('Access denied - you do not have permission to update this checklist item')
        }
        throw new Error(updateError.message)
      }

      return updatedItem
    } catch (error: any) {
      console.error('Error updating checklist item:', error)
      throw error
    }
  }

  async deleteChecklistItem(projectId: string, itemId: string) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Delete checklist item - RLS policies will handle access control
      const { error: deleteError, count } = await supabase
        .from('project_checklist_items')
        .delete({ count: 'exact' })
        .eq('id', itemId)
        .eq('project_id', projectId)

      if (deleteError) {
        if (deleteError.message.includes('permission') || deleteError.code === '42501') {
          throw new Error('Access denied - you do not have permission to delete this checklist item')
        }
        throw new Error(deleteError.message)
      }

      // Check if any rows were actually deleted
      if (count === 0) {
        throw new Error('Checklist item not found or access denied')
      }

      return { message: 'Checklist item deleted successfully' }
    } catch (error: any) {
      console.error('Error deleting checklist item:', error)
      throw error
    }
  }

  // ==================== PROJECT ASSIGNMENT METHODS ====================

  async assignUserToProject(projectId: string, userId: string) {
    return this.addProjectMember(projectId, userId)
  }

  async removeUserFromProject(projectId: string, userId: string) {
    return this.removeProjectMember(projectId, userId)
  }

  // ==================== FILE METHODS ====================

  async uploadProjectFile(projectId: string, file: any) {
    try {
      // Remove sensitive logging
      console.log('Processing file upload...')

      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Prepare file for upload
      let fileData: Blob
      let fileName: string
      let mimeType: string
      let fileSize: number

      if (file.uri) {
        // React Native file
        const response = await fetch(file.uri)
        fileData = await response.blob()
        fileName = file.name || `upload-${Date.now()}.bin`
        mimeType = file.mimeType || file.type || 'application/octet-stream'
        fileSize = file.size || fileData.size
      } else {
        // Web File object
        fileData = file
        fileName = file.name
        mimeType = file.type
        fileSize = file.size
      }

      // SECURITY: Validate file before upload
      const validation = validateFile(
        { name: fileName, size: fileSize, type: mimeType },
        'PROJECT_FILE'
      )
      
      if (!validation.valid) {
        throw new Error(validation.error || FILE_SECURITY_ERRORS.UPLOAD_FAILED)
      }

      // SECURITY: Sanitize filename to prevent injection attacks
      const sanitizedFileName = sanitizeFilename(fileName)
      
      // Create unique file path with sanitized name
      const timestamp = Date.now()
      const fileExt = sanitizedFileName.split('.').pop()
      const uniqueFileName = `${projectId}/${timestamp}-${sanitizedFileName}`

      console.log('Uploading file (sanitized)...')

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(uniqueFileName, fileData, {
          contentType: mimeType,
          upsert: false
        })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      // Get the public URL (even though bucket is private, we need the path)
      const { data: urlData } = supabase.storage
        .from('project-files')
        .getPublicUrl(uniqueFileName)

      // Store file metadata in database
      const { data: fileRecord, error: dbError } = await supabase
        .from('project_files')
        .insert([{
          project_id: projectId,
          filename: uniqueFileName, // Sanitized filename with path
          original_name: sanitizedFileName,  // Sanitized original filename
          file_path: uniqueFileName,
          file_size: fileSize,
          mime_type: mimeType,
          uploaded_by: user.id
        }])
        .select()
        .single()

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage.from('project-files').remove([uniqueFileName])
        throw new Error(dbError.message)
      }

      console.log('Upload successful')
      return fileRecord
    } catch (error: any) {
      console.error('File upload failed:', error)
      throw error
    }
  }

  async getProjectFiles(projectId: string, sortBy: string = 'uploaded_at', sortOrder: string = 'desc') {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Get files for this project - RLS policies will handle access control
      const { data: files, error } = await supabase
        .from('project_files')
        .select(`
          *,
          users!uploaded_by(username)
        `)
        .eq('project_id', projectId)
        .order(sortBy, { ascending: sortOrder === 'asc' })

      if (error) {
        throw new Error(error.message)
      }

      return { files: files || [] }
    } catch (error: any) {
      console.error('Error fetching project files:', error)
      throw error
    }
  }

  async downloadProjectFile(projectId: string, fileId: string) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Get file metadata - RLS policies will handle access control
      const { data: fileRecord, error: fileError } = await supabase
        .from('project_files')
        .select('*')
        .eq('id', fileId)
        .eq('project_id', projectId)
        .single()

      if (fileError || !fileRecord) {
        throw new Error('File not found or access denied')
      }

      // Create signed URL for download
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('project-files')
        .createSignedUrl(fileRecord.file_path, 3600) // Valid for 1 hour

      if (urlError) {
        throw new Error(urlError.message)
      }

      return {
        downloadUrl: signedUrlData.signedUrl,
        filename: fileRecord.filename,
        mimeType: fileRecord.mime_type
      }
    } catch (error: any) {
      console.error('File download failed:', error)
      throw error
    }
  }

  async deleteProjectFile(projectId: string, fileId: string) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Get file metadata - RLS will handle access control for viewing
      const { data: fileRecord, error: fileError } = await supabase
        .from('project_files')
        .select('*')
        .eq('id', fileId)
        .eq('project_id', projectId)
        .single()

      if (fileError || !fileRecord) {
        throw new Error('File not found or access denied')
      }

      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('project-files')
        .remove([fileRecord.file_path])

      if (storageError) {
        throw new Error(storageError.message)
      }

      // Delete from database - RLS will handle delete permissions
      const { error: dbError } = await supabase
        .from('project_files')
        .delete()
        .eq('id', fileId)

      if (dbError) {
        throw new Error(dbError.message)
      }

      return { message: 'File deleted successfully' }
    } catch (error: any) {
      console.error('File deletion failed:', error)
      throw error
    }
  }

  // ==================== PROJECT MEMBER METHODS ====================

  async addProjectMember(projectId: string, userId: string) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Verify the user being added is a member of the same group
      const { data: project } = await supabase
        .from('projects')
        .select('group_id, created_by')
        .eq('id', projectId)
        .single()

      if (!project) {
        throw new Error('Project not found')
      }

      // Check if the user being added is a member of the project's group
      const { data: groupMembership } = await supabase
        .from('group_memberships')
        .select('id')
        .eq('group_id', project.group_id)
        .eq('user_id', userId)
        .single()

      if (!groupMembership) {
        throw new Error('User is not a member of this project\'s group')
      }

      // Check if user is already a project member
      const { data: existingMember } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single()

      if (existingMember) {
        throw new Error('User is already a member of this project')
      }

      // Add the user as a project member
      const { data: newMember, error: insertError } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: userId,
          role: 'member',
          added_by: user.id
        })
        .select(`
          id,
          role,
          created_at,
          users!user_id (
            id,
            username,
            email,
            profile_picture
          )
        `)
        .single()

      if (insertError) {
        throw new Error(insertError.message)
      }

      return { 
        message: 'Project member added successfully',
        member: newMember
      }
    } catch (error: any) {
      console.error('Error adding project member:', error)
      throw error
    }
  }

  async removeProjectMember(projectId: string, userId: string) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Get project info
      const { data: project } = await supabase
        .from('projects')
        .select('created_by')
        .eq('id', projectId)
        .single()

      if (!project) {
        throw new Error('Project not found')
      }

      // Cannot remove the project creator
      if (userId === project.created_by) {
        throw new Error('Cannot remove the project creator')
      }

      // Check if this would be the last member
      const { data: members, count } = await supabase
        .from('project_members')
        .select('id', { count: 'exact' })
        .eq('project_id', projectId)

      if (count && count <= 1) {
        throw new Error('Cannot remove the last member from the project')
      }

      // Remove the member
      const { error: deleteError, count: deletedCount } = await supabase
        .from('project_members')
        .delete({ count: 'exact' })
        .eq('project_id', projectId)
        .eq('user_id', userId)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      if (deletedCount === 0) {
        throw new Error('User is not a member of this project or access denied')
      }

      return { message: 'Project member removed successfully' }
    } catch (error: any) {
      console.error('Error removing project member:', error)
      throw error
    }
  }

  async getAvailableProjectMembers(projectId: string) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Get project's group ID
      const { data: project } = await supabase
        .from('projects')
        .select('group_id')
        .eq('id', projectId)
        .single()

      if (!project) {
        throw new Error('Project not found')
      }

      // Get all group members who are NOT already project members
      const { data: availableMembers, error } = await supabase
        .from('group_memberships')
        .select(`
          user_id,
          users (
            id,
            username,
            email,
            profile_picture
          )
        `)
        .eq('group_id', project.group_id)
        .not('user_id', 'in', `(
          SELECT user_id FROM project_members WHERE project_id = '${projectId}'
        )`)

      if (error) {
        throw new Error(error.message)
      }

      return { 
        availableMembers: availableMembers?.map(m => m.users) || []
      }
    } catch (error: any) {
      console.error('Error fetching available project members:', error)
      throw error
    }
  }

  // ==================== GROUP DEFAULT CHECKLIST METHODS ====================

  async getGroupDefaultChecklistItems(groupId: string) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Get default checklist items for the group
      const { data: defaultItems, error } = await supabase
        .from('group_default_checklist_items')
        .select('*')
        .eq('group_id', groupId)
        .order('display_order', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }

      return { defaultItems: defaultItems || [] }
    } catch (error: any) {
      console.error('Error fetching group default checklist items:', error)
      throw error
    }
  }

  async addGroupDefaultChecklistItem(groupId: string, title: string, description?: string, displayOrder?: number) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Verify user is admin of the group
      const { data: membership } = await supabase
        .from('group_memberships')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single()

      if (!membership || membership.role !== 'admin') {
        throw new Error('Access denied - you must be a group admin')
      }

      // If no display order provided, get the next order
      let order = displayOrder
      if (order === undefined) {
        const { data: lastItem } = await supabase
          .from('group_default_checklist_items')
          .select('display_order')
          .eq('group_id', groupId)
          .order('display_order', { ascending: false })
          .limit(1)

        order = (lastItem?.[0]?.display_order || 0) + 1
      }

      // Create the default checklist item
      const { data: newItem, error } = await supabase
        .from('group_default_checklist_items')
        .insert({
          group_id: groupId,
          title,
          description,
          display_order: order,
          created_by: user.id
        })
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return {
        defaultItem: newItem,
        message: 'Default checklist item added successfully'
      }
    } catch (error: any) {
      console.error('Error adding group default checklist item:', error)
      throw error
    }
  }

  async updateGroupDefaultChecklistItem(itemId: string, data: {
    title?: string;
    description?: string;
    display_order?: number;
  }) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Update the item - RLS policies will handle access control
      const { data: updatedItem, error } = await supabase
        .from('group_default_checklist_items')
        .update(data)
        .eq('id', itemId)
        .select()
        .single()

      if (error) {
        if (error.message.includes('permission') || error.code === '42501') {
          throw new Error('Access denied - you must be a group admin')
        }
        throw new Error(error.message)
      }

      return updatedItem
    } catch (error: any) {
      console.error('Error updating group default checklist item:', error)
      throw error
    }
  }

  async deleteGroupDefaultChecklistItem(itemId: string) {
    try {
      const { data: { user }, error: authError } = await this.getCachedUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Delete the item - RLS policies will handle access control
      const { error: deleteError, count } = await supabase
        .from('group_default_checklist_items')
        .delete({ count: 'exact' })
        .eq('id', itemId)

      if (deleteError) {
        if (deleteError.message.includes('permission') || deleteError.code === '42501') {
          throw new Error('Access denied - you must be a group admin')
        }
        throw new Error(deleteError.message)
      }

      if (count === 0) {
        throw new Error('Default checklist item not found or access denied')
      }

      return { message: 'Default checklist item deleted successfully' }
    } catch (error: any) {
      console.error('Error deleting group default checklist item:', error)
      throw error
    }
  }

  // ==================== HELPER METHODS ====================

  // Get current user session
  async getCurrentUser() {
    const { data: { user }, error } = await this.getCachedUser()
    if (error || !user) {
      return null
    }
    return user
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

export default new SupabaseService()