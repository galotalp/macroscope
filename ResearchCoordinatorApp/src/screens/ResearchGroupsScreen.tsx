import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Card, Title, Button, Text, FAB, Appbar, Snackbar, Badge, IconButton } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { User, ResearchGroup } from '../types';
import apiService from '../services/api';
import { transformErrorMessage } from '../utils/errorMessages';
import { colors, spacing, typography, shadows, borderRadius, componentStyles, textStyles } from '../theme';
import UserMenuDropdown from '../components/UserMenuDropdown';

interface ResearchGroupsScreenProps {
  user: User | null;
  onLogout: () => void;
  onNavigateToProfile: () => void;
  onNavigateToSettings: () => void;
  onNavigateToJoinGroup: () => void;
  onNavigateToCreateGroup: () => void;
  onNavigateToProjects: (groupId: string) => void;
  onNavigateToGroupSettings?: (groupId: string) => void;
}

const ResearchGroupsScreen: React.FC<ResearchGroupsScreenProps> = ({
  user,
  onLogout,
  onNavigateToProfile,
  onNavigateToSettings,
  onNavigateToJoinGroup,
  onNavigateToCreateGroup,
  onNavigateToProjects,
  onNavigateToGroupSettings,
}) => {
  const [groups, setGroups] = useState<ResearchGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarColor, setSnackbarColor] = useState('green');
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [groupsWithPendingRequests, setGroupsWithPendingRequests] = useState<any[]>([]);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const response = await apiService.getResearchGroups();
      setGroups(response.groups || []);
    } catch (error) {
      console.error('Error loading groups:', error);
      showSnackbar(transformErrorMessage(error), 'red');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    
    // Load pending requests count separately so it doesn't affect groups loading
    loadPendingRequestsCount();
  };

  const loadPendingRequestsCount = async () => {
    try {
      const response = await apiService.getPendingJoinRequestCounts();
      setPendingRequestsCount(response.totalPendingRequests || 0);
      setGroupsWithPendingRequests(response.groupCounts || []);
    } catch (error) {
      console.error('Error loading pending requests count:', error);
      // Don't show error for this, as it's not critical
    }
  };

  const showSnackbar = (message: string, color: string = 'green') => {
    setSnackbarMessage(message);
    setSnackbarColor(color);
    setSnackbarVisible(true);
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadGroups();
  }, []);

  const handleGroupPress = (groupId: string) => {
    onNavigateToProjects(groupId);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.appBarGradient}
      >
        <Appbar.Header style={styles.appBar}>
          <Appbar.Content title="Research Groups" titleStyle={styles.appBarTitle} />
          {pendingRequestsCount > 0 && (
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => {
                // Navigate to first group with pending requests
                if (onNavigateToGroupSettings && groupsWithPendingRequests.length > 0) {
                  const firstGroupWithRequests = groupsWithPendingRequests.find(g => g.pendingRequestsCount > 0);
                  if (firstGroupWithRequests) {
                    onNavigateToGroupSettings(firstGroupWithRequests.groupId);
                  }
                } else {
                  showSnackbar(`You have ${pendingRequestsCount} pending join request${pendingRequestsCount > 1 ? 's' : ''}`, colors.warning);
                }
              }}
            >
              <IconButton 
                icon="bell" 
                size={24}
                iconColor={colors.textInverse}
              />
              <Badge 
                size={18}
                style={styles.notificationBadge}
              >
                {pendingRequestsCount}
              </Badge>
            </TouchableOpacity>
          )}
          <UserMenuDropdown
            user={user}
            onProfile={onNavigateToProfile}
            onSettings={onNavigateToSettings}
            onLogout={onLogout}
          />
        </Appbar.Header>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading groups...</Text>
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No research groups found</Text>
            <Text style={styles.emptySubtext}>
              Create a new group or join an existing one to get started
            </Text>
          </View>
        ) : (
          groups.map((group) => (
            <Card key={group.id} style={styles.groupCard}>
              <Card.Content style={styles.cardContent}>
                <Title style={styles.groupTitle}>{group.name}</Title>
                {group.description && (
                  <Text style={styles.groupDescription}>{group.description}</Text>
                )}
                <View style={styles.buttonContainer}>
                  <Button
                    mode="contained"
                    onPress={() => handleGroupPress(group.id)}
                    style={styles.viewButton}
                    buttonColor={colors.primary}
                    contentStyle={styles.buttonContent}
                  >
                    View Projects
                  </Button>
                  {onNavigateToGroupSettings && (
                    <Button
                      mode="outlined"
                      onPress={() => onNavigateToGroupSettings(group.id)}
                      style={styles.settingsButton}
                      contentStyle={styles.buttonContent}
                      textColor={colors.primary}
                      icon="cog"
                    >
                      Settings
                    </Button>
                  )}
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <View style={styles.fabContainer}>
        <FAB
          icon="plus"
          label="Create Group"
          onPress={onNavigateToCreateGroup}
          style={[styles.fab, styles.fabSecondary]}
        />
        <FAB
          icon="account-plus"
          label="Join Group"
          onPress={onNavigateToJoinGroup}
          style={styles.fab}
        />
      </View>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={[styles.snackbar, { backgroundColor: snackbarColor }]}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  appBarGradient: {
    elevation: 4,
  },
  appBar: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  appBarTitle: {
    color: colors.textInverse,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  scrollContent: {
    paddingBottom: 140, // Space for 2 FABs (56px each) + margins (16px each) + extra buffer
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  loadingText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
    color: colors.text,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  groupCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
    backgroundColor: colors.surface,
  },
  cardContent: {
    padding: spacing.lg,
  },
  groupTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  groupDescription: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: typography.lineHeight.normal * typography.fontSize.md,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  viewButton: {
    flex: 1,
    borderRadius: borderRadius.md,
  },
  settingsButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderColor: colors.primary,
  },
  buttonContent: {
    paddingVertical: spacing.xs,
  },
  fabContainer: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    flexDirection: 'column',
  },
  fab: {
    marginBottom: spacing.sm,
    ...shadows.large,
    backgroundColor: colors.primary,
  },
  fabSecondary: {
    backgroundColor: colors.secondary,
  },
  notificationButton: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.accent,
    color: colors.textInverse,
    minWidth: 18,
    height: 18,
  },
  snackbar: {
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
});

export default ResearchGroupsScreen;
