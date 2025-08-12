import { Platform, Alert as RNAlert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';

/**
 * Platform-specific helper functions for web compatibility
 */

export const isWeb = Platform.OS === 'web';

/**
 * Download file with web compatibility
 */
export const downloadFile = async (url: string, filename: string, mimeType?: string) => {
  if (isWeb) {
    // Web implementation - use browser's download
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Create a download link
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      
      return { success: true };
    } catch (error) {
      console.error('Web download error:', error);
      throw error;
    }
  } else {
    // Native implementation - use FileSystem and Sharing
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileUri = FileSystem.documentDirectory + sanitizedFilename;
    
    const downloadResult = await FileSystem.downloadAsync(url, fileUri);
    
    if (downloadResult.status !== 200) {
      throw new Error(`Download failed with status: ${downloadResult.status}`);
    }
    
    // Check file exists
    const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
    
    if (!fileInfo.exists) {
      throw new Error('Downloaded file not found');
    }
    
    if (fileInfo.size === 0) {
      throw new Error('Downloaded file is empty');
    }
    
    // Use Expo Sharing to present native share sheet
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: mimeType,
        dialogTitle: `Save ${filename}`,
        UTI: mimeType
      });
    }
    
    return { success: true, uri: downloadResult.uri };
  }
};

/**
 * Show alert with web compatibility
 */
export const showAlert = (
  title: string,
  message: string,
  buttons: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>
) => {
  if (isWeb) {
    // Web implementation - use confirm/alert
    if (buttons.length === 2 && buttons.some(b => b.style === 'cancel')) {
      // Confirmation dialog
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed) {
        const actionButton = buttons.find(b => b.style !== 'cancel');
        if (actionButton?.onPress) {
          actionButton.onPress();
        }
      }
    } else {
      // Simple alert
      window.alert(`${title}\n\n${message}`);
      if (buttons[0]?.onPress) {
        buttons[0].onPress();
      }
    }
  } else {
    // Native implementation
    RNAlert.alert(title, message, buttons);
  }
};

/**
 * Pick image with web compatibility
 */
export const pickImage = async (options: ImagePicker.ImagePickerOptions = {}) => {
  if (isWeb) {
    // Web implementation - use file input
    return new Promise<ImagePicker.ImagePickerResult>((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      input.onchange = async (e) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        
        if (!file) {
          resolve({ canceled: true, assets: [] });
          return;
        }
        
        // Convert to data URI
        const reader = new FileReader();
        reader.onload = (event) => {
          const uri = event.target?.result as string;
          resolve({
            canceled: false,
            assets: [{
              uri,
              width: 0, // Would need to load image to get dimensions
              height: 0,
              type: 'image',
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type,
              file: file, // Include actual File object for web uploads
            } as any]
          });
        };
        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
      };
      
      input.click();
    });
  } else {
    // Native implementation
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access photos was denied');
    }
    
    return ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      ...options
    });
  }
};

/**
 * Pick document with web compatibility
 */
export const pickDocument = async () => {
  if (isWeb) {
    // Web implementation - use file input
    return new Promise<{ uri: string; name: string; size: number; mimeType: string } | null>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = false;
      
      input.onchange = async (e) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        
        if (!file) {
          resolve(null);
          return;
        }
        
        // For web, return the actual File object and blob URL
        const uri = URL.createObjectURL(file);
        
        resolve({
          uri,
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          file: file // Include the actual File object for web uploads
        } as any);
      };
      
      input.click();
    });
  } else {
    // Native implementation using DocumentPicker
    const DocumentPicker = await import('expo-document-picker');
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    
    if (result.canceled || !result.assets?.[0]) {
      return null;
    }
    
    return {
      uri: result.assets[0].uri,
      name: result.assets[0].name,
      size: result.assets[0].size || 0,
      mimeType: result.assets[0].mimeType || 'application/octet-stream'
    };
  }
};

/**
 * Handle file upload for web
 */
export const prepareFileForUpload = async (fileUri: string, fileName: string, mimeType: string) => {
  if (isWeb && fileUri.startsWith('blob:')) {
    // For web, convert blob URL back to File/Blob
    const response = await fetch(fileUri);
    const blob = await response.blob();
    
    // Clean up the blob URL
    URL.revokeObjectURL(fileUri);
    
    return blob;
  } else if (isWeb && fileUri.startsWith('data:')) {
    // Handle data URI for web
    const response = await fetch(fileUri);
    const blob = await response.blob();
    return blob;
  } else {
    // For native, return FormData-compatible object
    return {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any;
  }
};