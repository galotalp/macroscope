import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Appbar, Card, Button, Text, FAB, Snackbar, ActivityIndicator, Chip, DataTable } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import supabaseService from '../services/supabaseService';
import { transformErrorMessage } from '../utils/errorMessages';
import { colors, spacing, typography, shadows, borderRadius, componentStyles, textStyles } from '../theme';
import CreateProjectScreen from './CreateProjectScreen';
import ProjectDetailsScreen from './ProjectDetailsScreen';

interface ProjectsScreenProps {
  groupId: string;
  onNavigateBack: () => void;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  created_by: string;
  priority?: string;
  notes?: string;
  status?: string;
  group_id: string;
  file_count?: number;
}

interface ProjectWithDetails extends Project {
  completedTasks?: number;
  totalTasks?: number;
  assignedMembers?: string[];
  file_count?: number;
}

const ProjectsScreen: React.FC<ProjectsScreenProps> = ({ groupId, onNavigateBack }) => {
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [groupName, setGroupName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarColor, setSnackbarColor] = useState('green');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
    loadGroupName();
  }, [groupId]);

  const loadGroupName = async () => {
    try {
      const response = await supabaseService.getResearchGroups();
      console.log('Research groups response:', response);
      const group = response.groups?.find((g: any) => g.id === groupId);
      console.log('Found group for ID', groupId, ':', group);
      const name = group?.name || 'Group';
      console.log('Setting group name to:', name);
      setGroupName(name);
    } catch (error) {
      console.error('Error loading group name:', error);
      setGroupName('Group');
    }
  };

  const loadProjects = async () => {
    try {
      const response = await supabaseService.getProjects(groupId);
      const projectsData = response.projects || [];
      
      // Load details for each project to get task counts and assigned members
      const projectsWithDetails = await Promise.all(
        projectsData.map(async (project: Project) => {
          try {
            const details = await supabaseService.getProjectDetails(project.id);
            console.log('Project details for', project.name, ':', JSON.stringify(details.members, null, 2));
            const completedTasks = details.checklist?.filter((item: any) => item.completed).length || 0;
            const totalTasks = details.checklist?.length || 0;
            const assignedMembers = details.members?.map((m: any) => m.users?.username || m.username) || [];
            
            return {
              ...project,
              completedTasks,
              totalTasks,
              assignedMembers,
              file_count: project.file_count || 0
            };
          } catch (error) {
            console.error('Error loading project details:', error);
            return {
              ...project,
              completedTasks: 0,
              totalTasks: 0,
              assignedMembers: [],
              file_count: project.file_count || 0
            };
          }
        })
      );
      
      setProjects(projectsWithDetails);
    } catch (error) {
      console.error('Error loading projects:', error);
      showSnackbar(transformErrorMessage(error), 'red');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const showSnackbar = (message: string, color: string = 'green') => {
    setSnackbarMessage(message);
    setSnackbarColor(color);
    setSnackbarVisible(true);
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadProjects();
    loadGroupName();
  }, [groupId]);

  const handleCreateProject = () => {
    setShowCreateProject(true);
  };

  const handleProjectCreated = () => {
    loadProjects();
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return colors.priorityHigh;
      case 'medium': return colors.priorityMedium;
      case 'low': return colors.priorityLow;
      case 'completed': return colors.priorityCompleted;
      default: return colors.priorityNone;
    }
  };

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case 'high': return 'High';
      case 'medium': return 'Med';
      case 'low': return 'Low';
      case 'completed': return 'Completed';
      default: return 'None';
    }
  };

  const groupProjectsByPriority = () => {
    const grouped = {
      high: projects.filter(p => p.priority === 'high'),
      medium: projects.filter(p => p.priority === 'medium'),
      low: projects.filter(p => p.priority === 'low'),
      completed: projects.filter(p => p.priority === 'completed'),
    };
    return grouped;
  };

  const renderProjectsByPriority = () => {
    const grouped = groupProjectsByPriority();
    
    return (
      <View style={styles.prioritySections}>
        {/* High Priority Section */}
        {grouped.high.length > 0 && (
          <Card style={[styles.priorityCard, styles.highPriorityCard]}>
            <View style={[styles.sectionHeader, styles.highPriorityHeader]}>
              <Text style={styles.sectionTitle}>High Priority ({grouped.high.length})</Text>
            </View>
            <DataTable>
              <DataTable.Header style={styles.tableHeader}>
                <DataTable.Title style={styles.nameColumn} textStyle={styles.headerText}>
                  Project Name
                </DataTable.Title>
                <DataTable.Title numeric style={styles.tasksColumn} textStyle={styles.headerText}>
                  Tasks
                </DataTable.Title>
                <DataTable.Title style={styles.assignedColumn} textStyle={styles.headerText}>
                  Members
                </DataTable.Title>
                <DataTable.Title numeric style={styles.filesColumn} textStyle={styles.headerText}>
                  Files
                </DataTable.Title>
              </DataTable.Header>
              {grouped.high.map((project) => renderProjectRow(project))}
            </DataTable>
          </Card>
        )}

        {/* Medium Priority Section */}
        {grouped.medium.length > 0 && (
          <Card style={[styles.priorityCard, styles.mediumPriorityCard]}>
            <View style={[styles.sectionHeader, styles.mediumPriorityHeader]}>
              <Text style={styles.sectionTitle}>Medium Priority ({grouped.medium.length})</Text>
            </View>
            <DataTable>
              <DataTable.Header style={styles.tableHeader}>
                <DataTable.Title style={styles.nameColumn} textStyle={styles.headerText}>
                  Project Name
                </DataTable.Title>
                <DataTable.Title numeric style={styles.tasksColumn} textStyle={styles.headerText}>
                  Tasks
                </DataTable.Title>
                <DataTable.Title style={styles.assignedColumn} textStyle={styles.headerText}>
                  Members
                </DataTable.Title>
                <DataTable.Title numeric style={styles.filesColumn} textStyle={styles.headerText}>
                  Files
                </DataTable.Title>
              </DataTable.Header>
              {grouped.medium.map((project) => renderProjectRow(project))}
            </DataTable>
          </Card>
        )}

        {/* Low Priority Section */}
        {grouped.low.length > 0 && (
          <Card style={[styles.priorityCard, styles.lowPriorityCard]}>
            <View style={[styles.sectionHeader, styles.lowPriorityHeader]}>
              <Text style={styles.sectionTitle}>Low Priority ({grouped.low.length})</Text>
            </View>
            <DataTable>
              <DataTable.Header style={styles.tableHeader}>
                <DataTable.Title style={styles.nameColumn} textStyle={styles.headerText}>
                  Project Name
                </DataTable.Title>
                <DataTable.Title numeric style={styles.tasksColumn} textStyle={styles.headerText}>
                  Tasks
                </DataTable.Title>
                <DataTable.Title style={styles.assignedColumn} textStyle={styles.headerText}>
                  Members
                </DataTable.Title>
                <DataTable.Title numeric style={styles.filesColumn} textStyle={styles.headerText}>
                  Files
                </DataTable.Title>
              </DataTable.Header>
              {grouped.low.map((project) => renderProjectRow(project))}
            </DataTable>
          </Card>
        )}

        {/* Completed Priority Section */}
        {grouped.completed.length > 0 && (
          <Card style={[styles.priorityCard, styles.completedPriorityCard]}>
            <View style={[styles.sectionHeader, styles.completedPriorityHeader]}>
              <Text style={styles.sectionTitle}>Completed ({grouped.completed.length})</Text>
            </View>
            <DataTable>
              <DataTable.Header style={styles.tableHeader}>
                <DataTable.Title style={styles.nameColumn} textStyle={styles.headerText}>
                  Project Name
                </DataTable.Title>
                <DataTable.Title numeric style={styles.tasksColumn} textStyle={styles.headerText}>
                  Tasks
                </DataTable.Title>
                <DataTable.Title style={styles.assignedColumn} textStyle={styles.headerText}>
                  Members
                </DataTable.Title>
                <DataTable.Title numeric style={styles.filesColumn} textStyle={styles.headerText}>
                  Files
                </DataTable.Title>
              </DataTable.Header>
              {grouped.completed.map((project) => renderProjectRow(project))}
            </DataTable>
          </Card>
        )}
      </View>
    );
  };

  const renderProjectRow = (project: ProjectWithDetails) => (
    <TouchableOpacity
      key={project.id}
      onPress={() => setSelectedProjectId(project.id)}
      style={styles.projectRow}
    >
      <DataTable.Row style={styles.dataRow}>
        <DataTable.Cell style={styles.nameColumn}>
          <Text style={styles.projectName}>{project.name}</Text>
        </DataTable.Cell>
        <DataTable.Cell numeric style={styles.tasksColumn}>
          <Text style={styles.taskCount}>
            {project.completedTasks}/{project.totalTasks}
          </Text>
        </DataTable.Cell>
        <DataTable.Cell style={styles.assignedColumn}>
          <Text style={styles.assignedText} numberOfLines={1} ellipsizeMode="tail">
            {project.assignedMembers && project.assignedMembers.length > 0
              ? `${project.assignedMembers.length} user${project.assignedMembers.length > 1 ? 's' : ''}`
              : 'None'}
          </Text>
        </DataTable.Cell>
        <DataTable.Cell numeric style={styles.filesColumn}>
          <Text style={styles.fileCount}>
            {project.file_count || 0}
          </Text>
        </DataTable.Cell>
      </DataTable.Row>
    </TouchableOpacity>
  );

  if (showCreateProject) {
    return (
      <CreateProjectScreen
        groupId={groupId}
        onNavigateBack={() => setShowCreateProject(false)}
        onProjectCreated={handleProjectCreated}
      />
    );
  }

  if (selectedProjectId) {
    return (
      <ProjectDetailsScreen
        projectId={selectedProjectId}
        onNavigateBack={() => {
          setSelectedProjectId(null);
          loadProjects();
        }}
        onProjectDeleted={() => {
          setSelectedProjectId(null);
          loadProjects();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.appBarGradient}
      >
        <Appbar.Header style={styles.appBar}>
          <Appbar.BackAction onPress={onNavigateBack} iconColor={colors.textInverse} />
          <Appbar.Content title="Projects" titleStyle={styles.appBarTitle} />
        </Appbar.Header>
      </LinearGradient>
      
      {groupName && (
        <View style={styles.groupNameContainer}>
          <Text style={styles.groupNameText}>{groupName}</Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading projects...</Text>
          </View>
        ) : projects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No projects found</Text>
            <Text style={styles.emptySubtext}>
              Create your first project to get started
            </Text>
          </View>
        ) : (
          renderProjectsByPriority()
        )}
      </ScrollView>

      <FAB
        icon="plus"
        label="Create Project"
        onPress={handleCreateProject}
        style={styles.fab}
      />

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
    paddingBottom: 80, // Space for single FAB (56px) + margins + extra buffer
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.md,
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
  prioritySections: {
    marginBottom: spacing.md,
  },
  priorityCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
    backgroundColor: colors.surface,
  },
  highPriorityCard: {
    backgroundColor: 'rgba(244, 67, 54, 0.05)',
    borderLeftWidth: 4,
    borderLeftColor: colors.priorityHigh,
  },
  mediumPriorityCard: {
    backgroundColor: 'rgba(255, 193, 7, 0.05)',
    borderLeftWidth: 4,
    borderLeftColor: colors.priorityMedium,
  },
  lowPriorityCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    borderLeftWidth: 4,
    borderLeftColor: colors.priorityLow,
  },
  completedPriorityCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderLeftWidth: 4,
    borderLeftColor: colors.priorityCompleted,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  highPriorityHeader: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  mediumPriorityHeader: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
  },
  lowPriorityHeader: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  completedPriorityHeader: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  tableHeader: {
    backgroundColor: 'transparent',
  },
  headerText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  projectRow: {
    borderRadius: borderRadius.sm,
  },
  dataRow: {
    minHeight: 56,
    paddingVertical: spacing.sm,
  },
  nameColumn: {
    flex: 2,
    paddingRight: spacing.sm,
  },
  tasksColumn: {
    width: 45,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  assignedColumn: {
    width: 80,
    paddingHorizontal: spacing.xs,
  },
  filesColumn: {
    width: 45,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  projectName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
  },
  taskCount: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  assignedText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  fileCount: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: colors.primary,
    ...shadows.large,
  },
  groupNameContainer: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondaryDark,
  },
  groupNameText: {
    fontSize: typography.fontSize.sm,
    color: colors.textInverse,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },
  snackbar: {
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
});

export default ProjectsScreen;
