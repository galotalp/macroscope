import React, { useState } from 'react';
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

  // Debug logging
  console.log('UserAvatar - profilePictureUrl:', profilePictureUrl);
  console.log('UserAvatar - username:', username);
  console.log('UserAvatar - isDefaultProfilePicture:', isDefaultProfilePicture(profilePictureUrl));
  console.log('UserAvatar - size:', size);
  console.log('UserAvatar - imageLoadError:', imageLoadError);
  
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
    return (
      <Avatar.Image
        size={size}
        source={{ 
          uri: profilePictureUrl,
          cache: 'force-cache'
        }}
        style={style}
        onError={(error) => {
          console.log('UserAvatar - Image failed to load:', error);
          console.log('UserAvatar - Setting imageLoadError to true, will fallback to initials');
          setImageLoadError(true);
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