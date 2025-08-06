import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Menu, IconButton, Text, Avatar } from 'react-native-paper';
import { User } from '../types';

interface UserMenuDropdownProps {
  user: User | null;
  onProfile: () => void;
  onSettings: () => void;
  onLogout: () => void;
}

const UserMenuDropdown: React.FC<UserMenuDropdownProps> = ({
  user,
  onProfile,
  onSettings,
  onLogout,
}) => {
  const [visible, setVisible] = useState(false);

  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  const handleMenuItemPress = (action: () => void) => {
    closeMenu();
    action();
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Menu
      visible={visible}
      onDismiss={closeMenu}
      anchor={
        <IconButton
          icon={() => (
            <Avatar.Text
              size={32}
              label={user?.username ? getInitials(user.username) : '?'}
            />
          )}
          onPress={openMenu}
        />
      }
      contentStyle={styles.menuContent}
    >
      <View style={styles.userInfo}>
        <Text style={styles.username}>{user?.username || 'User'}</Text>
        <Text style={styles.email}>{user?.email || ''}</Text>
      </View>
      
      <Menu.Item
        onPress={() => handleMenuItemPress(onProfile)}
        title="My Profile"
        leadingIcon="account"
      />
      
      <Menu.Item
        onPress={() => handleMenuItemPress(onSettings)}
        title="Settings"
        leadingIcon="cog"
      />
      
      <Menu.Item
        onPress={() => handleMenuItemPress(onLogout)}
        title="Log Out"
        leadingIcon="logout"
      />
    </Menu>
  );
};

const styles = StyleSheet.create({
  menuContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 8,
    minWidth: 200,
  },
  userInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
});

export default UserMenuDropdown;
