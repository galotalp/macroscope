import { defaultAvatarImages } from '../../assets/default-avatars';

// Default profile picture configurations
export const defaultProfilePictures = defaultAvatarImages;

export const isDefaultProfilePicture = (profilePictureUrl?: string): boolean => {
  return profilePictureUrl?.startsWith('default://') || false;
};

export const getDefaultProfilePictureId = (profilePictureUrl?: string): string | null => {
  if (!profilePictureUrl || !profilePictureUrl.startsWith('default://')) {
    return null;
  }
  return profilePictureUrl.replace('default://', '');
};

export const getDefaultProfilePictureConfig = (profilePictureUrl?: string) => {
  const id = getDefaultProfilePictureId(profilePictureUrl);
  if (!id || !defaultProfilePictures[id as keyof typeof defaultProfilePictures]) {
    return null;
  }
  return defaultProfilePictures[id as keyof typeof defaultProfilePictures];
};

export const getInitials = (name?: string): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};