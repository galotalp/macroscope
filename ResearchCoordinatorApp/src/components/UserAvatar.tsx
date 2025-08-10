import React, { useState, useEffect } from 'react';
import { Avatar } from 'react-native-paper';
import { 
  isDefaultProfilePicture, 
  getDefaultProfilePictureConfig, 
  getInitials 
} from '../utils/avatarUtils';

interface UserAvatarProps {
  profilePictureUrl?: string;
  username?: string;
  size?: number;
  style?: any;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  profilePictureUrl, 
  username, 
  size = 40, 
  style 
}) => {
  const [imageLoadError, setImageLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const maxRetries = 2;

  // Debug logging removed for performance

  // Reset error state when profilePictureUrl changes
  useEffect(() => {
    setImageLoadError(false);
    setRetryCount(0);
    setIsLoading(false);
  }, [profilePictureUrl]);
  
  // Check if it's a default profile picture
  if (isDefaultProfilePicture(profilePictureUrl)) {
    const config = getDefaultProfilePictureConfig(profilePictureUrl);
    if (config) {
      return (
        <Avatar.Image
          size={size}
          source={config.source}
          style={[{ backgroundColor: config.backgroundColor }, style]}
        />
      );
    }
  }

  // If it's a custom profile picture URL and hasn't failed to load
  if (profilePictureUrl && !isDefaultProfilePicture(profilePictureUrl) && !imageLoadError) {
    
    // Add cache busting and retry logic for better reliability
    const imageUri = retryCount > 0 
      ? `${profilePictureUrl}?retry=${retryCount}&t=${Date.now()}` 
      : profilePictureUrl;
    
    return (
      <Avatar.Image
        size={size}
        source={{ 
          uri: imageUri,
          cache: 'reload' // Use reload instead of force-cache for fresh images
        }}
        style={style}
        onLoadStart={() => {
          setIsLoading(true);
        }}
        onLoad={() => {
          setIsLoading(false);
        }}
        onError={(error) => {
          setIsLoading(false);
          
          if (retryCount < maxRetries) {
            setRetryCount(prev => prev + 1);
          } else {
            setImageLoadError(true);
          }
        }}
      />
    );
  }

  // Fallback to initials
  return (
    <Avatar.Text
      size={size}
      label={getInitials(username)}
      style={style}
    />
  );
};

export default UserAvatar;