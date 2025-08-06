import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Title,
  TextInput,
  Button,
  Avatar,
  Text,
  Snackbar,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import apiService from '../services/api';
import ProfilePictureSelector from '../components/ProfilePictureSelector';
import UserAvatar from '../components/UserAvatar';
import { transformErrorMessage } from '../utils/errorMessages';
import { User } from '../types';
import { API_URL } from '../config';

interface ProfileScreenProps {
  user: User | null;
  onNavigateBack: () => void;
  onUserUpdate: (updatedUser: User) => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onNavigateBack,
  onUserUpdate,
}) => {
  // Debug logging
  console.log('ProfileScreen - user object:', JSON.stringify(user, null, 2));
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarColor, setSnackbarColor] = useState('green');
  const [profilePictureSelectorVisible, setProfilePictureSelectorVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();

  // Refresh user profile data when screen loads
  const refreshProfileData = async (showLoading = false) => {
    if (showLoading) {
      setRefreshing(true);
    }
    
    try {
      const response = await apiService.getUserProfile();
      if (response.user) {
        onUserUpdate(response.user);
        if (showLoading) {
          showSnackbar('Profile refreshed successfully!');
        }
      }
    } catch (error) {
      console.error('Failed to refresh profile data:', error);
      if (showLoading) {
        showSnackbar('Failed to refresh profile data', 'red');
      }
    } finally {
      if (showLoading) {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setBio(user.bio || '');
    }
    
    // Refresh profile data when component mounts
    refreshProfileData();
  }, [user]);

  const showSnackbar = (message: string, color: string = 'green') => {
    setSnackbarMessage(message);
    setSnackbarColor(color);
    setSnackbarVisible(true);
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const response = await apiService.updateUserProfile({
        bio: bio.trim(),
      });

      if (response.user) {
        onUserUpdate(response.user);
        showSnackbar('Profile updated successfully!');
      }
    } catch (error) {
      showSnackbar(transformErrorMessage(error), 'red');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showSnackbar(transformErrorMessage('Failed to select image'), 'red');
    }
  };

  const uploadProfilePicture = async (imageUri: string) => {
    setUploadingImage(true);
    try {
      const fileName = `profile_${Date.now()}.jpg`;
      const response = await apiService.uploadProfilePicture(imageUri, fileName);
      
      if (response.user) {
        onUserUpdate(response.user);
        showSnackbar('Profile picture updated successfully!');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      showSnackbar(transformErrorMessage(error), 'red');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDefaultPictureSelect = async (defaultPictureId: string) => {
    setProfilePictureSelectorVisible(false);
    setUploadingImage(true);
    
    try {
      // For now, we'll use the default picture ID as a special identifier
      // In a real implementation, you'd have actual image URLs
      const defaultPictureUrl = `default://${defaultPictureId}`;
      
      // Call API to set default profile picture
      const response = await apiService.updateProfile({ 
        bio: user?.bio,
        profile_picture: defaultPictureUrl 
      });
      
      if (onUserUpdate) {
        onUserUpdate(response.user);
      }
      
      showSnackbar('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error setting default profile picture:', error);
      showSnackbar(transformErrorMessage(error), 'red');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCustomPictureUpload = () => {
    setProfilePictureSelectorVisible(false);
    pickImage(); // Use the existing image picker function
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refreshProfileData(true)}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>My Profile</Title>
          
          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={() => setProfilePictureSelectorVisible(true)} disabled={uploadingImage}>
              <UserAvatar
                profilePictureUrl={user?.profile_picture}
                username={user?.username || username}
                size={100}
                style={styles.avatar}
              />
              {uploadingImage && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator size="small" color="white" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.avatarNote}>
              {uploadingImage ? 'Uploading...' : 'Tap to change profile picture'}
            </Text>
          </View>

          <TextInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            disabled={true}
            right={<TextInput.Icon icon="lock" />}
          />

          <TextInput
            label="Email"
            value={user?.email || ''}
            style={styles.input}
            disabled={true}
            right={<TextInput.Icon icon="lock" />}
          />

          <TextInput
            label="Bio"
            value={bio}
            onChangeText={setBio}
            style={styles.input}
            multiline
            numberOfLines={3}
            disabled={loading}
            placeholder="Tell us about yourself..."
          />

          <Text style={styles.dateText}>
            Member since: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
          </Text>

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleUpdateProfile}
              style={styles.button}
              disabled={loading}
            >
              {loading ? <ActivityIndicator size="small" color="white" /> : 'Update Profile'}
            </Button>
            
            <Button
              mode="outlined"
              onPress={onNavigateBack}
              style={styles.button}
              disabled={loading}
            >
              Back
            </Button>
          </View>
        </Card.Content>
      </Card>

      <ProfilePictureSelector
        visible={profilePictureSelectorVisible}
        onDismiss={() => setProfilePictureSelectorVisible(false)}
        onSelectDefault={handleDefaultPictureSelect}
        onUploadCustom={handleCustomPictureUpload}
      />

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={[styles.snackbar, { backgroundColor: snackbarColor }]}
      >
        {snackbarMessage}
      </Snackbar>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 24,
    fontWeight: 'bold',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    marginBottom: 10,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 10,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  dateText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    gap: 10,
  },
  button: {
    marginVertical: 5,
  },
  snackbar: {
    marginBottom: 16,
  },
});

export default ProfileScreen;
