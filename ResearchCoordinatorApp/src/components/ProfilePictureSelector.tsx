import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { 
  Modal, 
  Portal, 
  Button, 
  Text, 
  Avatar,
  Card,
  Title,
  Divider 
} from 'react-native-paper';
import { defaultProfilePictures } from '../utils/avatarUtils';

interface ProfilePictureSelectorProps {
  visible: boolean;
  onDismiss: () => void;
  onSelectDefault: (imageName: string) => void;
  onUploadCustom: () => void;
}

// Convert defaultProfilePictures to array format for display
const defaultPictures = Object.entries(defaultProfilePictures).map(([id, config]) => ({
  id,
  name: config.name,
  source: config.source,
  backgroundColor: config.backgroundColor
}));

const ProfilePictureSelector: React.FC<ProfilePictureSelectorProps> = ({
  visible,
  onDismiss,
  onSelectDefault,
  onUploadCustom
}) => {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>Choose Profile Picture</Title>
            
            <Text style={styles.sectionTitle}>Default Options</Text>
            <View style={styles.defaultOptions}>
              {defaultPictures.map((picture) => (
                <TouchableOpacity
                  key={picture.id}
                  style={styles.defaultOption}
                  onPress={() => onSelectDefault(picture.id)}
                >
                  <Avatar.Image
                    size={60}
                    source={picture.source}
                    style={[styles.avatar, { backgroundColor: picture.backgroundColor }]}
                  />
                  <Text style={styles.optionName}>{picture.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Divider style={styles.divider} />
            
            <Button
              mode="contained"
              onPress={onUploadCustom}
              icon="camera"
              style={styles.uploadButton}
            >
              Upload Your Own Photo
            </Button>
            
            <Button
              mode="outlined"
              onPress={onDismiss}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
          </Card.Content>
        </Card>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    padding: 20,
  },
  card: {
    borderRadius: 12,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 10,
  },
  defaultOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  defaultOption: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  avatar: {
    marginBottom: 8,
  },
  optionName: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 10,
    textAlign: 'center',
    color: '#666',
  },
  divider: {
    marginVertical: 20,
  },
  uploadButton: {
    marginBottom: 10,
  },
  cancelButton: {
    marginTop: 5,
  },
});

export default ProfilePictureSelector;