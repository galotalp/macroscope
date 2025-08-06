import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const API_BASE_URL = API_URL;

class ApiService {
  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    headers?: Record<string, string>
  ) {
    const token = await this.getAuthToken();
    const url = `${API_BASE_URL}${endpoint}`;

    console.log(`Making ${method} request to: ${url}`);

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, config);
      
      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`API Error: ${response.status}`, errorData);
        throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth methods
  async login(email: string, password: string) {
    const response = await this.makeRequest('/auth/login', 'POST', { email, password });
    if (response.token) {
      await AsyncStorage.setItem('authToken', response.token);
    }
    return response;
  }

  async register(email: string, password: string, username: string) {
    try {
      const response = await this.makeRequest('/auth/register', 'POST', { email, password, username });
      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  async resendVerificationEmail(email: string) {
    try {
      const response = await this.makeRequest('/auth/resend-verification', 'POST', { email });
      return response;
    } catch (error) {
      console.error('Resend verification failed:', error);
      throw error;
    }
  }

  async logout() {
    await AsyncStorage.removeItem('authToken');
  }

  // User methods
  async getUserProfile() {
    const response = await this.makeRequest('/users/profile');
    console.log('getUserProfile response:', JSON.stringify(response, null, 2));
    return response;
  }

  async updateUserProfile(profileData: { bio?: string }) {
    return this.makeRequest('/users/profile', 'PUT', profileData);
  }

  async updateProfile(profileData: { bio?: string; profile_picture?: string }) {
    return this.makeRequest('/users/profile', 'PUT', profileData);
  }

  async uploadProfilePicture(imageUri: string, fileName: string) {
    // Convert image to base64
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove the data:image/...;base64, prefix
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.readAsDataURL(blob);
    });

    const payload = {
      filename: fileName,
      fileData: base64,
      mimeType: 'image/jpeg'
    };

    return this.makeRequest('/users/profile/upload-picture', 'POST', payload);
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.makeRequest('/users/change-password', 'POST', { 
      currentPassword, 
      newPassword 
    });
  }

  // Research group methods
  async getResearchGroups() {
    return this.makeRequest('/groups');
  }

  async createResearchGroup(name: string, description: string) {
    return this.makeRequest('/groups', 'POST', { name, description });
  }

  async joinResearchGroup(groupId: string) {
    return this.makeRequest(`/groups/${groupId}/join`, 'POST');
  }

  // New method for requesting to join a group
  async requestToJoinGroup(groupId: string) {
    return this.makeRequest(`/groups/${groupId}/request-join`, 'POST');
  }

  // Search groups by name or invite code
  async searchGroups(query: string) {
    return this.makeRequest(`/groups/search?query=${encodeURIComponent(query)}`);
  }

  // Get group details including members and join requests (for admins)
  async getGroupDetails(groupId: string) {
    return this.makeRequest(`/groups/${groupId}/details`);
  }

  // Get pending join request counts for groups where user is admin
  async getPendingJoinRequestCounts() {
    return this.makeRequest('/groups/pending-requests-count');
  }

  // Approve or reject join request (for admins)
  async respondToJoinRequest(groupId: string, requestId: string, action: 'approve' | 'reject') {
    return this.makeRequest(`/groups/${groupId}/join-requests/${requestId}/${action}`, 'POST');
  }

  // Remove member from group (for admins)
  async removeMemberFromGroup(groupId: string, userId: string) {
    return this.makeRequest(`/groups/${groupId}/members/${userId}`, 'DELETE');
  }

  async deleteResearchGroup(groupId: string) {
    return this.makeRequest(`/groups/${groupId}`, 'DELETE');
  }

  async updateResearchGroup(groupId: string, data: { name?: string; description?: string }) {
    return this.makeRequest(`/groups/${groupId}`, 'PUT', data);
  }

  async getGroupMembers(groupId: string) {
    return this.makeRequest(`/groups/${groupId}/members`);
  }

  async getAvailableGroups() {
    return this.makeRequest('/groups/available');
  }

  // Project methods
  async getProjects(groupId: string) {
    return this.makeRequest(`/projects/group/${groupId}`);
  }

  async createProject(data: {
    name: string;
    description: string;
    groupId: string;
    priority?: string;
    notes?: string;
    memberIds?: string[];
  }) {
    return this.makeRequest('/projects', 'POST', data);
  }

  async getProjectDetails(projectId: string) {
    return this.makeRequest(`/projects/${projectId}`);
  }

  async updateProject(projectId: string, data: {
    name?: string;
    description?: string;
    priority?: string;
    notes?: string;
  }) {
    return this.makeRequest(`/projects/${projectId}`, 'PUT', data);
  }

  async getProjectMembers(groupId: string) {
    return this.makeRequest(`/projects/group/${groupId}/members`);
  }

  async addChecklistItem(projectId: string, title: string, description?: string) {
    return this.makeRequest(`/projects/${projectId}/checklist`, 'POST', { title, description });
  }

  async updateChecklistItem(projectId: string, itemId: string, data: {
    title?: string;
    description?: string;
    completed?: boolean;
  }) {
    return this.makeRequest(`/projects/${projectId}/checklist/${itemId}`, 'PUT', data);
  }

  async deleteChecklistItem(projectId: string, itemId: string) {
    return this.makeRequest(`/projects/${projectId}/checklist/${itemId}`, 'DELETE');
  }

  async assignUserToProject(projectId: string, userId: string) {
    return this.makeRequest(`/projects/${projectId}/assign`, 'POST', { userId });
  }

  async removeUserFromProject(projectId: string, userId: string) {
    return this.makeRequest(`/projects/${projectId}/assign/${userId}`, 'DELETE');
  }

  async deleteProject(projectId: string) {
    return this.makeRequest(`/projects/${projectId}`, 'DELETE');
  }

  // File management methods using Supabase Storage
  async uploadProjectFile(projectId: string, file: any) {
    console.log('File object received:', file);

    try {
      // Convert file to base64
      let fileData: string;
      
      if (file.uri) {
        // React Native - read file as base64
        const response = await fetch(file.uri);
        const blob = await response.blob();
        fileData = await this.blobToBase64(blob);
      } else {
        // Web File object
        fileData = await this.fileToBase64(file);
      }

      // Remove data URL prefix if present
      if (fileData.includes(',')) {
        fileData = fileData.split(',')[1];
      }

      console.log('File converted to base64, length:', fileData.length);

      const payload = {
        filename: file.name || 'upload.bin',
        fileData: fileData,
        mimeType: file.mimeType || file.type || 'application/octet-stream',
        fileSize: file.size
      };

      console.log('Upload payload:', { 
        filename: payload.filename, 
        mimeType: payload.mimeType, 
        fileSize: payload.fileSize,
        dataLength: payload.fileData.length 
      });

      const result = await this.makeRequest(`/projects/${projectId}/files`, 'POST', payload);
      console.log('Upload successful:', result);
      return result;
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  // Helper function to convert File to base64
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  // Helper function to convert Blob to base64
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  async getProjectFiles(projectId: string, sortBy: string = 'uploaded_at', sortOrder: string = 'desc') {
    return this.makeRequest(`/projects/${projectId}/files?sortBy=${sortBy}&sortOrder=${sortOrder}`);
  }

  async downloadProjectFile(projectId: string, fileId: string) {
    try {
      const result = await this.makeRequest(`/projects/${projectId}/files/${fileId}/download`);
      return result; // Returns { downloadUrl, filename, mimeType }
    } catch (error) {
      console.error('File download failed:', error);
      throw error;
    }
  }

  async deleteProjectFile(projectId: string, fileId: string) {
    return this.makeRequest(`/projects/${projectId}/files/${fileId}`, 'DELETE');
  }

}

export default new ApiService();
