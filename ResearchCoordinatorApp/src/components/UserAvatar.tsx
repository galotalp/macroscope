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

  // Debug logging
  console.log('UserAvatar - profilePictureUrl:', profilePictureUrl);
  console.log('UserAvatar - username:', username);
  console.log('UserAvatar - isDefaultProfilePicture:', isDefaultProfilePicture(profilePictureUrl));
  console.log('UserAvatar - size:', size);
  console.log('UserAvatar - imageLoadError:', imageLoadError);

  // Reset error state when profilePictureUrl changes
  useEffect(() => {
    setImageLoadError(false);
    setRetryCount(0);
    setIsLoading(false);
  }, [profilePictureUrl]);
  
  // Check if it's a default profile picture
  if (isDefaultProfilePicture(profilePictureUrl)) {
    console.log('UserAvatar - Using default profile picture');
    const config = getDefaultProfilePictureConfig(profilePictureUrl);
    if (config) {
      console.log('UserAvatar - Default config found:', config);
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
    console.log('UserAvatar - Using custom profile picture URL:', profilePictureUrl);
    
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
          console.log('UserAvatar - Image loaded successfully');
        }}
        onError={(error) => {
          setIsLoading(false);
          console.log('UserAvatar - Image failed to load:', error);
          console.log(`UserAvatar - Retry count: ${retryCount}/${maxRetries}`);
          
          if (retryCount < maxRetries) {
            console.log('UserAvatar - Retrying image load...');
            setRetryCount(prev => prev + 1);
          } else {
            console.log('UserAvatar - Max retries reached, falling back to initials');
            setImageLoadError(true);
          }
        }}
      />
    );
  }

  // Fallback to initials
  console.log('UserAvatar - Falling back to initials for username:', username);
  return (
    <Avatar.Text
      size={size}
      label={getInitials(username)}
      style={style}
    />
  );
};

export default UserAvatar;