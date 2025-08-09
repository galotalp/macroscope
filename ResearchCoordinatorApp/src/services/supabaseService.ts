import { supabase } from '../config/supabase'
import { User } from '../types'

class SupabaseService {
  // ==================== AUTH METHODS ====================
  
  async register(email: string, password: string, username: string) {
    try {
      console.log('Starting registration for:', email, username)
      
      // Sign up user with Supabase Auth (skip email confirmation temporarily)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          },
          emailRedirectTo: undefined // Disable email confirmation temporarily
        }
      })

      console.log('Auth signup result:', { data: !!authData, error: authError?.message })

      if (authError) {
        console.error('Auth error details:', authError)
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error('Registration failed - no user data returned')
      }

      // User profile will be created automatically by the database trigger
      console.log('User registered successfully:', authData.user.id)
      
      // Wait for trigger to complete profile creation
      await new Promise(resolve => setTimeout(resolve, 1000))

      return {
        message: 'Registration successful! Please check your email to verify your account.',
        requiresVerification: true,
        email: email
      }
    } catch (error: any) {
      console.error('Registration failed - FULL ERROR:', JSON.stringify(error, null, 2))
      console.error('Error name:', error?.name)
      console.error('Error message:', error?.message)
      console.error('Error code:', error?.code)
      console.error('Error details:', error?.details)
      
      if (error.message) {
        throw new Error(`Registration failed: ${error.message}`)
      } else {
        throw new Error('Database error saving new user')
      }
    }
  }

  async login(email: string, password: string) {
    try {
      console.log('Attempting Supabase login for email:', email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      console.log('Supabase auth response:', { data: !!data, error: error?.message })

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
        profile_picture: userProfile?.profile_picture
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
      console.log('getUserProfile: Starting...');
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      console.log('getUserProfile: Got auth user:', user?.id, 'Error:', authError);
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      console.log('getUserProfile: Querying users table for user:', user.id);
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, username, email, bio, profile_picture, created_at')
        .eq('id', user.id)
        .single()

      console.log('getUserProfile: Query result - Profile:', profile, 'Error:', profileError);

      if (profileError) {
        throw new Error(profileError.message)
      }

      console.log('getUserProfile: Returning profile successfully');
      return { user: profile }
    } catch (error: any) {
      console.error('Error fetching user profile:', error)
      throw error
    }
  }

  async updateUserProfile(profileData: { bio?: string }) {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
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

      return data
    } catch (error: any) {
      console.error('Error updating user profile:', error)
      throw error
    }
  }

  async updateProfile(profileData: { bio?: string; profile_picture?: string }) {
    return this.updateUserProfile(profileData)
  }

  async uploadProfilePicture(imageUri: string, fileName: string) {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Create file path
      const fileExt = fileName.split('.').pop() || 'jpg'
      const filePath = `${user.id}/profile-${Date.now()}.${fileExt}`
      
      console.log('Uploading image from:', imageUri)
      console.log('To path:', filePath)

      // Use Supabase's built-in React Native support with FormData
      const formData = new FormData()
      formData.append('file', {
        uri: imageUri,
        name: fileName,
        type: `image/${fileExt}`,
      } as any)

      // Upload using Supabase storage
      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, formData, {
          cacheControl: '3600',
          upsert: true,
        })

      console.log('Upload response:', { data, error })

      if (error) {
        throw new Error(error.message)
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath)

      console.log('Public URL:', publicUrl)

      // Update user profile in database
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ profile_picture: publicUrl })
        .eq('id', user.id)
        .select()
        .single()

      console.log('Database update result:', { updatedUser, updateError })

      if (updateError) {
        throw new Error(updateError.message)
      }

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
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Get groups where user is a member
      const { data: userGroups, error } = await supabase
        .from('group_memberships')
        .select(`
          groups (
            id,
            name,
            description,
            created_at,
            created_by
          )
        `)
        .eq('user_id', user.id)

      if (error) {
        throw new Error(error.message)
      }

      const groups = userGroups?.map((membership: any) => membership.groups) || []
      return { groups }
    } catch (error: any) {
      console.error('Error fetching groups:', error)
      throw error
    }
  }

  async createResearchGroup(name: string, description: string) {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
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
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
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
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Verify user is a member of the group
      const { data: membership, error: membershipError } = await supabase
        .from('group_memberships')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single()

      if (membershipError || !membership) {
        throw new Error('Access denied - you are not a member of this group')
      }

      // Get projects for the group
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      // Sort by priority
      const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 }
      const sortedProjects = projects?.sort((a, b) => {
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority
        }
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }) || []

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
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
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

      // No need to manually add creator as member - database trigger handles this automatically
      // The trigger ensures it's IMPOSSIBLE for a project to exist without its creator being a member

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
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Get project with group membership verification
      const { data: project, error } = await supabase
        .from('projects')
        .select(`
          *,
          groups!inner(
            id,
            name,
            group_memberships!inner(user_id)
          )
        `)
        .eq('id', projectId)
        .eq('groups.group_memberships.user_id', user.id)
        .single()

      if (error || !project) {
        throw new Error('Project not found or access denied')
      }

      // Get project members
      const { data: projectMembers } = await supabase
        .from('project_members')
        .select(`
          role,
          users!user_id (
            id,
            username,
            email,
            profile_picture
          )
        `)
        .eq('project_id', projectId)

      // Format members to match frontend expectations
      const members = projectMembers?.map(pm => ({
        users: pm.users,
        role: pm.role
      })) || []

      // Get checklist items
      const { data: checklistItems } = await supabase
        .from('project_checklist_items')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      // Get project files
      const { data: projectFiles } = await supabase
        .from('project_files')
        .select(`
          *,
          users!uploaded_by (
            id,
            username,
            email
          )
        `)
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false })

      return { 
        project,
        members: members || [],
        checklist: checklistItems || [],
        files: projectFiles || []
      }
    } catch (error: any) {
      console.error('Error fetching project details:', error)
      throw error
    }
  }

  async getProjectMembers(groupId: string) {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
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
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
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
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Simply try to delete - RLS policies will handle access control
      // Only project creators can delete (as per the policy)
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (deleteError) {
        if (deleteError.message.includes('permission') || deleteError.code === '42501') {
          throw new Error('Access denied - only project creators can delete projects')
        }
        throw new Error(deleteError.message)
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
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
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
            created_at,
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
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
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
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
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
      const { error: removeError } = await supabase
        .from('group_memberships')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId)

      if (removeError) {
        throw new Error(removeError.message)
      }

      return { message: 'Member removed successfully' }
    } catch (error: any) {
      console.error('Error removing member:', error)
      throw error
    }
  }

  async updateResearchGroup(groupId: string, data: { name?: string; description?: string }) {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
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
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
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
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Search for groups by name (public groups or groups user can discover)
      const { data: groups, error } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          created_at,
          created_by
        `)
        .ilike('name', `%${query}%`)
        .limit(20)

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
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Get all groups the user is NOT a member of
      const { data: groups, error } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          created_at,
          created_by
        `)
        .not('id', 'in', `(
          SELECT group_id FROM group_memberships WHERE user_id = '${user.id}'
        )`)
        .limit(50)

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
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
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
      console.log('supabaseService.changePassword called with currentPassword length:', currentPassword.length, 'newPassword length:', newPassword.length)
      
      console.log('About to call supabase.auth.updateUser')
      // Simply update the password - Supabase handles validation internally
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      console.log('supabase.auth.updateUser completed. Error:', updateError, 'Data:', updateData)

      if (updateError) {
        console.error('Update error occurred:', updateError)
        throw new Error(updateError.message)
      }

      console.log('Password updated successfully, returning response')

      return { 
        message: 'Password changed successfully',
        user: updateData?.user
      }
    } catch (error: any) {
      console.error('Error in changePassword service:', error)
      throw new Error(error.message || 'Failed to change password')
    }
  }

  // Add a method to refresh user data explicitly
  async refreshUserData() {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
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
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
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
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
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
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Delete checklist item - RLS policies will handle access control
      const { error: deleteError } = await supabase
        .from('project_checklist_items')
        .delete()
        .eq('id', itemId)
        .eq('project_id', projectId)

      if (deleteError) {
        if (deleteError.message.includes('permission') || deleteError.code === '42501') {
          throw new Error('Access denied - you do not have permission to delete this checklist item')
        }
        throw new Error(deleteError.message)
      }

      return { message: 'Checklist item deleted successfully' }
    } catch (error: any) {
      console.error('Error deleting checklist item:', error)
      throw error
    }
  }

  // ==================== PROJECT ASSIGNMENT METHODS ====================

  async assignUserToProject(projectId: string, userId: string) {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // For now, we'll store project assignments in a simple way
      // You could create a project_assignments table, but for simplicity
      // we might just use the existing structure or add it to projects metadata
      
      // This is a placeholder - you might want to implement a proper assignment system
      throw new Error('Project assignment feature not fully implemented yet')
    } catch (error: any) {
      console.error('Error assigning user to project:', error)
      throw error
    }
  }

  async removeUserFromProject(projectId: string, userId: string) {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // This is a placeholder - you might want to implement a proper assignment system
      throw new Error('Project assignment feature not fully implemented yet')
    } catch (error: any) {
      console.error('Error removing user from project:', error)
      throw error
    }
  }

  // ==================== FILE METHODS ====================

  async uploadProjectFile(projectId: string, file: any) {
    try {
      console.log('File object received:', file)

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // No explicit access check needed - RLS policies will handle it

      // Prepare file for upload
      let fileData: Blob
      let fileName: string
      let mimeType: string

      if (file.uri) {
        // React Native file
        const response = await fetch(file.uri)
        fileData = await response.blob()
        fileName = file.name || `upload-${Date.now()}.bin`
        mimeType = file.mimeType || file.type || 'application/octet-stream'
      } else {
        // Web File object
        fileData = file
        fileName = file.name
        mimeType = file.type
      }

      // Create unique file path: projectId/timestamp-filename
      const timestamp = Date.now()
      const fileExt = fileName.split('.').pop()
      const uniqueFileName = `${projectId}/${timestamp}-${fileName}`

      console.log('Uploading file:', { fileName, mimeType, size: fileData.size })

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
          filename: uniqueFileName, // Processed filename with path
          original_name: fileName,  // Original filename from user
          file_path: uniqueFileName,
          file_size: fileData.size,
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

      console.log('Upload successful:', fileRecord)
      return fileRecord
    } catch (error: any) {
      console.error('File upload failed:', error)
      throw error
    }
  }

  async getProjectFiles(projectId: string, sortBy: string = 'uploaded_at', sortOrder: string = 'desc') {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
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
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
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
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
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

  // ==================== HELPER METHODS ====================

  // Get current user session
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
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