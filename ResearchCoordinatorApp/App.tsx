import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Linking, Alert } from 'react-native';
import { Provider as PaperProvider, Banner } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './src/config';
import { User } from './src/types';
import apiService from './src/services/api';
import theme, { colors } from './src/theme';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import EmailVerificationScreen from './src/screens/EmailVerificationScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResearchGroupsScreen from './src/screens/ResearchGroupsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import JoinGroupScreen from './src/screens/JoinGroupScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import ResearchGroupSettingsScreen from './src/screens/ResearchGroupSettingsScreen';

type Screen = 'login' | 'register' | 'email-verification' | 'forgot-password' | 'groups' | 'profile' | 'settings' | 'join-group' | 'create-group' | 'projects' | 'group-settings';

interface AppState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  currentScreen: Screen;
  isDemoMode: boolean;
  selectedGroupId: string | null;
  registrationMessage?: string;
  pendingVerificationEmail?: string;
  pendingVerificationPassword?: string;
}


export default function App() {
  const [state, setState] = useState<AppState>({
    user: null,
    token: null,
    isLoading: true,
    currentScreen: 'login',
    isDemoMode: false,
    selectedGroupId: null,
  });

  useEffect(() => {
    checkAuthStatus();
    checkDemoMode();
    
    // Handle deep links
    const handleDeepLink = (url: string | null) => {
      if (!url) return;
      
      // Parse the URL
      if (url.startsWith('macroscope://login?verified=true')) {
        // Extract email from URL parameters
        const emailMatch = url.match(/email=([^&]+)/);
        const email = emailMatch ? decodeURIComponent(emailMatch[1]) : '';
        
        // Show success message and navigate to login
        Alert.alert(
          'Email Verified! ✅',
          'Your account has been successfully verified. You can now log in.',
          [
            {
              text: 'OK',
              onPress: () => {
                setState(prev => ({
                  ...prev,
                  currentScreen: 'login',
                  registrationMessage: 'Your email has been verified! You can now log in.',
                }));
              }
            }
          ]
        );
      } else if (url.startsWith('macroscope://login?reset=success')) {
        // Extract email from URL parameters
        const emailMatch = url.match(/email=([^&]+)/);
        const email = emailMatch ? decodeURIComponent(emailMatch[1]) : '';
        
        // Show success message and navigate to login
        Alert.alert(
          'Password Reset Complete! ✅',
          'Your password has been successfully updated. You can now log in with your new password.',
          [
            {
              text: 'OK',
              onPress: () => {
                setState(prev => ({
                  ...prev,
                  currentScreen: 'login',
                  registrationMessage: 'Your password has been reset! You can now log in with your new password.',
                }));
              }
            }
          ]
        );
      }
    };
    
    // Check if app was opened with a deep link
    Linking.getInitialURL().then(handleDeepLink);
    
    // Listen for deep links while app is open
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        // Verify token and get user info
        const userProfile = await apiService.getUserProfile();
        
        // Check for last visited group
        const lastVisitedGroupId = await AsyncStorage.getItem('lastVisitedGroupId');
        
        // Verify that the user still has access to the last visited group
        let shouldNavigateToProjects = false;
        if (lastVisitedGroupId) {
          try {
            // Try to get projects for the group to verify access
            await apiService.getProjects(lastVisitedGroupId);
            shouldNavigateToProjects = true;
          } catch (error) {
            console.log('User no longer has access to last visited group, clearing it');
            await AsyncStorage.removeItem('lastVisitedGroupId');
          }
        }
        
        setState(prev => ({
          ...prev,
          user: userProfile.user,
          token,
          currentScreen: shouldNavigateToProjects ? 'projects' : 'groups',
          selectedGroupId: shouldNavigateToProjects ? lastVisitedGroupId : null,
          isLoading: false,
        }));
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear invalid token
      await AsyncStorage.removeItem('authToken');
      setState(prev => ({ ...prev, isLoading: false, user: null, token: null }));
    }
  };

  const checkDemoMode = async () => {
    try {
      // Construct the base URL properly
      const baseUrl = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
      console.log('Checking demo mode at:', baseUrl);
      
      const response = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.warn('Demo mode check failed with status:', response.status);
        return;
      }
      
      const data = await response.json();
      console.log('Demo mode response:', data);
      setState(prev => ({ ...prev, isDemoMode: data.demoMode }));
    } catch (error) {
      console.error('Failed to check demo mode:', error);
      // Don't fail the app if demo mode check fails
      setState(prev => ({ ...prev, isDemoMode: false }));
    }
  };

  const handleLoginSuccess = async (user: User, token: string) => {
    // Check for last visited group
    const lastVisitedGroupId = await AsyncStorage.getItem('lastVisitedGroupId');
    
    // Verify that the user still has access to the last visited group
    let shouldNavigateToProjects = false;
    if (lastVisitedGroupId) {
      try {
        // Try to get projects for the group to verify access
        await apiService.getProjects(lastVisitedGroupId);
        shouldNavigateToProjects = true;
      } catch (error) {
        console.log('User no longer has access to last visited group, clearing it');
        await AsyncStorage.removeItem('lastVisitedGroupId');
      }
    }
    
    setState(prev => ({
      ...prev,
      user,
      token,
      currentScreen: shouldNavigateToProjects ? 'projects' : 'groups',
      selectedGroupId: shouldNavigateToProjects ? lastVisitedGroupId : null,
      registrationMessage: undefined, // Clear the registration message
    }));
  };

  const handleRegisterSuccess = (email: string, password?: string) => {
    // Navigate to email verification screen
    setState(prev => ({
      ...prev,
      currentScreen: 'email-verification',
      pendingVerificationEmail: email,
      pendingVerificationPassword: password,
      registrationMessage: undefined,
    }));
  };

  const handleLogout = async () => {
    await apiService.logout();
    // Clear the last visited group on logout
    await AsyncStorage.removeItem('lastVisitedGroupId');
    setState(prev => ({
      ...prev,
      user: null,
      token: null,
      currentScreen: 'login',
      selectedGroupId: null,
    }));
  };

  const handleUserUpdate = (updatedUser: User) => {
    setState(prev => ({ ...prev, user: updatedUser }));
  };

  const navigateToScreen = async (screen: Screen, groupId?: string) => {
    // Store the last visited group when navigating to projects
    if (screen === 'projects' && groupId) {
      try {
        await AsyncStorage.setItem('lastVisitedGroupId', groupId);
      } catch (error) {
        console.error('Error storing last visited group:', error);
      }
    }
    
    setState(prev => ({
      ...prev,
      currentScreen: screen,
      selectedGroupId: groupId || null,
    }));
  };

  if (state.isLoading) {
    return (
      <PaperProvider theme={theme}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </PaperProvider>
    );
  }

  const renderScreen = () => {
    switch (state.currentScreen) {
      case 'login':
        return (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onNavigateToRegister={() => navigateToScreen('register')}
            onNavigateToForgotPassword={() => navigateToScreen('forgot-password')}
            onRequiresVerification={(email) => {
              setState(prev => ({
                ...prev,
                currentScreen: 'email-verification',
                pendingVerificationEmail: email,
              }));
            }}
            registrationMessage={state.registrationMessage}
          />
        );
      case 'register':
        return (
          <RegisterScreen
            onRegisterSuccess={handleRegisterSuccess}
            onNavigateToLogin={() => navigateToScreen('login')}
          />
        );
      case 'email-verification':
        return (
          <EmailVerificationScreen
            email={state.pendingVerificationEmail!}
            password={state.pendingVerificationPassword}
            onNavigateBack={() => navigateToScreen('register')}
            onNavigateToLogin={() => {
              setState(prev => ({
                ...prev,
                currentScreen: 'login',
                registrationMessage: 'Account verified! Please log in.',
                pendingVerificationEmail: undefined,
                pendingVerificationPassword: undefined,
              }));
            }}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPasswordScreen
            onNavigateBack={() => navigateToScreen('login')}
          />
        );
      case 'groups':
        return (
          <ResearchGroupsScreen
            user={state.user}
            onLogout={handleLogout}
            onNavigateToProfile={() => navigateToScreen('profile')}
            onNavigateToSettings={() => navigateToScreen('settings')}
            onNavigateToJoinGroup={() => navigateToScreen('join-group')}
            onNavigateToCreateGroup={() => navigateToScreen('create-group')}
            onNavigateToProjects={(groupId: string) => navigateToScreen('projects', groupId)}
            onNavigateToGroupSettings={(groupId: string) => navigateToScreen('group-settings', groupId)}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            user={state.user}
            onNavigateBack={() => navigateToScreen('groups')}
            onUserUpdate={handleUserUpdate}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            onNavigateBack={() => navigateToScreen('groups')}
          />
        );
      case 'join-group':
        return (
          <JoinGroupScreen
            onNavigateBack={() => navigateToScreen('groups')}
            onJoinSuccess={() => navigateToScreen('groups')}
          />
        );
      case 'create-group':
        return (
          <CreateGroupScreen
            onNavigateBack={() => navigateToScreen('groups')}
            onCreateSuccess={() => navigateToScreen('groups')}
          />
        );
      case 'projects':
        return (
          <ProjectsScreen
            groupId={state.selectedGroupId!}
            onNavigateBack={() => navigateToScreen('groups')}
          />
        );
      case 'group-settings':
        return (
          <ResearchGroupSettingsScreen
            groupId={state.selectedGroupId!}
            onNavigateBack={() => navigateToScreen('groups')}
            onGroupDeleted={() => navigateToScreen('groups')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <PaperProvider theme={theme}>
      <View style={styles.container}>
        {state.isDemoMode && (
          <Banner visible={true} style={styles.demoBanner}>
            <Text style={styles.demoBannerText}>
              🔧 Demo Mode - Data is not persisted
            </Text>
          </Banner>
        )}
        {renderScreen()}
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  demoBanner: {
    backgroundColor: colors.warning + '20', // 20% opacity
    borderBottomWidth: 1,
    borderBottomColor: colors.warning + '40', // 40% opacity
  },
  demoBannerText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '500',
  },
});
