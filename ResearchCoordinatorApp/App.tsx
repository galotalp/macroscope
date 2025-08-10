import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Linking, Alert } from 'react-native';
import { Provider as PaperProvider, Banner } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from './src/types';
import { supabase } from './src/config/supabase';
import supabaseService from './src/services/supabaseService';
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
  session: any | null;
  isLoading: boolean;
  currentScreen: Screen;
  selectedGroupId: string | null;
  registrationMessage?: string;
  pendingVerificationEmail?: string;
  pendingVerificationPassword?: string;
}


export default function App() {
  const [state, setState] = useState<AppState>({
    user: null,
    session: null,
    isLoading: true,
    currentScreen: 'login',
    selectedGroupId: null,
  });

  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (state.isLoading) {
        console.warn('Loading timeout - forcing navigation to login');
        setState(prev => ({
          ...prev,
          isLoading: false,
          currentScreen: 'login',
          user: null,
          session: null,
        }));
      }
    }, 10000); // 10 second timeout
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      // Clear the loading timeout since we got a response
      clearTimeout(loadingTimeout);
      
      // For USER_UPDATED events (like password changes), navigate to groups immediately
      // Don't try to refresh user data during this event as it can cause hangs
      if (event === 'USER_UPDATED' && session?.user) {
        console.log('Handling USER_UPDATED event - navigating to groups without profile refresh');
        
        console.log('Setting state and navigating to groups');
        setState(prev => ({
          ...prev,
          session: session,
          currentScreen: 'groups',
          selectedGroupId: null,
          isLoading: false,
        }));
        console.log('State updated successfully');
        return;
      }
      
      // For SIGNED_OUT events, immediately go to login without waiting
      if (event === 'SIGNED_OUT') {
        console.log('User signed out - navigating to login');
        setState(prev => ({
          ...prev,
          user: null,
          session: null,
          currentScreen: 'login',
          selectedGroupId: null,
          isLoading: false,
        }));
        return;
      }
      
      if (session?.user) {
        // User is signed in
        try {
          const userProfile = await supabaseService.getUserProfile();
          
          // Check for last visited group
          const lastVisitedGroupId = await AsyncStorage.getItem('lastVisitedGroupId');
          let shouldNavigateToProjects = false;
          
          if (lastVisitedGroupId) {
            try {
              await supabaseService.getProjects(lastVisitedGroupId);
              shouldNavigateToProjects = true;
            } catch (error) {
              console.log('User no longer has access to last visited group, clearing it');
              await AsyncStorage.removeItem('lastVisitedGroupId');
            }
          }
          
          setState(prev => ({
            ...prev,
            user: userProfile.user,
            session: session,
            currentScreen: shouldNavigateToProjects ? 'projects' : 'groups',
            selectedGroupId: shouldNavigateToProjects ? lastVisitedGroupId : null,
            isLoading: false,
          }));
        } catch (error) {
          console.error('Error loading user profile:', error);
          setState(prev => ({
            ...prev,
            user: null,
            session: null,
            currentScreen: 'login',
            isLoading: false,
          }));
        }
      } else {
        // No session - user is logged out
        setState(prev => ({
          ...prev,
          user: null,
          session: null,
          currentScreen: 'login',
          selectedGroupId: null,
          isLoading: false,
        }));
      }
    });

    // Check initial session
    checkInitialSession();
    
    // Clean up subscription and timeout
    return () => {
      clearTimeout(loadingTimeout);
      subscription?.unsubscribe();
    };
  }, []);

  const checkInitialSession = async () => {
    try {
      console.log('Checking initial session...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('Found existing session for user:', session.user.id);
        // Session exists, load user profile
        try {
          const userProfile = await supabaseService.getUserProfile();
          
          // Check for last visited group
          const lastVisitedGroupId = await AsyncStorage.getItem('lastVisitedGroupId');
          let shouldNavigateToProjects = false;
          
          if (lastVisitedGroupId) {
            try {
              await supabaseService.getProjects(lastVisitedGroupId);
              shouldNavigateToProjects = true;
            } catch (error) {
              console.log('User no longer has access to last visited group, clearing it');
              await AsyncStorage.removeItem('lastVisitedGroupId');
            }
          }
          
          setState(prev => ({
            ...prev,
            user: userProfile.user,
            session: session,
            currentScreen: shouldNavigateToProjects ? 'projects' : 'groups',
            selectedGroupId: shouldNavigateToProjects ? lastVisitedGroupId : null,
            isLoading: false,
          }));
        } catch (error) {
          console.error('Error loading user profile:', error);
          setState(prev => ({
            ...prev,
            user: null,
            session: null,
            currentScreen: 'login',
            isLoading: false,
          }));
        }
      } else {
        console.log('No existing session found');
        // No session, go to login
        setState(prev => ({
          ...prev,
          user: null,
          session: null,
          currentScreen: 'login',
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error('Error checking initial session:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        currentScreen: 'login',
      }));
    }
  };

  useEffect(() => {
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
      // Clean up deep link listener
    };
  }, []);

  const handleLoginSuccess = async (user: User, token: string) => {
    // The auth state change listener will handle the session automatically
    // Just clear the registration message
    setState(prev => ({
      ...prev,
      registrationMessage: undefined,
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
    await supabaseService.logout();
    // Clear the last visited group on logout
    await AsyncStorage.removeItem('lastVisitedGroupId');
    // The auth state change listener will handle updating the UI
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
            onNavigateToLogin={(verified) => {
              setState(prev => ({
                ...prev,
                currentScreen: 'login',
                // Only show verification message if actually verified
                registrationMessage: verified ? 'Account verified! Please log in.' : undefined,
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
});
