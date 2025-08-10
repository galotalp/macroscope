import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { 
  Appbar, 
  Card, 
  Title, 
  Button, 
  Text, 
  Snackbar, 
  ActivityIndicator, 
  Searchbar,
  Chip 
} from 'react-native-paper';
import supabaseService from '../services/supabaseService';

interface JoinGroupScreenProps {
  onNavigateBack: () => void;
  onJoinSuccess: () => void;
}

interface SearchableGroup {
  id: string;
  name: string;
  description?: string;
  invite_code: string;
  created_at: string;
  created_by: string;
}

const JoinGroupScreen: React.FC<JoinGroupScreenProps> = ({ onNavigateBack, onJoinSuccess }) => {
  const [groups, setGroups] = useState<SearchableGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarColor, setSnackbarColor] = useState('green');

  const loadAvailableGroups = async () => {
    try {
      setLoading(true);
      const response = await supabaseService.getAvailableGroups();
      setGroups(response.groups || []);
    } catch (error) {
      console.error('Error loading available groups:', error);
      showSnackbar('Failed to load available groups', 'red');
    } finally {
      setLoading(false);
    }
  };

  const searchGroups = async (query: string) => {
    if (!query.trim()) {
      setGroups([]);
      setHasSearched(false);
      return;
    }
    
    try {
      setLoading(true);
      setHasSearched(true);
      const response = await supabaseService.searchGroups(query);
      setGroups(response.groups || []);
    } catch (error) {
      console.error('Error searching groups:', error);
      showSnackbar('Failed to search groups', 'red');
    } finally {
      setLoading(false);
    }
  };

  // Don't load groups on mount - wait for user to search
  useEffect(() => {
    // Remove the automatic loading of groups
  }, []);

  const showSnackbar = (message: string, color: string = 'green') => {
    setSnackbarMessage(message);
    setSnackbarColor(color);
    setSnackbarVisible(true);
  };

  const handleJoinGroup = async (groupId: string) => {
    setJoiningGroupId(groupId);
    try {
      await supabaseService.requestToJoinGroup(groupId);
      showSnackbar('Join request sent successfully! The group owner will review your request.');
      // Don't navigate back immediately since the user needs to wait for approval
    } catch (error) {
      console.error('Error requesting to join group:', error);
      showSnackbar(error instanceof Error ? error.message : 'Failed to send join request', 'red');
    } finally {
      setJoiningGroupId(null);
    }
  };

  const handleSearchSubmit = () => {
    searchGroups(searchQuery);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setGroups([]);
      setHasSearched(false); // Reset search state when input is cleared
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={onNavigateBack} />
        <Appbar.Content title="Join Group" />
      </Appbar.Header>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search groups by name or invite code..."
          onChangeText={handleSearchChange}
          value={searchQuery}
          onSubmitEditing={handleSearchSubmit}
          style={styles.searchBar}
        />
        <Button
          mode="contained"
          onPress={handleSearchSubmit}
          disabled={!searchQuery.trim() || loading}
          style={styles.searchButton}
        >
          Enter
        </Button>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>
              {searchQuery ? 'Searching...' : 'Loading available groups...'}
            </Text>
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {hasSearched ? 'No groups found' : 'Search for groups to join'}
            </Text>
            <Text style={styles.emptySubtext}>
              {hasSearched 
                ? 'Try searching with a different term or invite code'
                : 'Enter a group name or invite code above and tap Enter'
              }
            </Text>
          </View>
        ) : (
          groups.map((group) => (
            <Card key={group.id} style={styles.groupCard}>
              <Card.Content>
                <Title>{group.name}</Title>
                {group.description && <Text style={styles.description}>{group.description}</Text>}
                
                <View style={styles.chipContainer}>
                  <Chip icon="key" style={styles.inviteChip}>
                    ID: {group.invite_code}
                  </Chip>
                </View>
                
                <Button
                  mode="contained"
                  onPress={() => handleJoinGroup(group.id)}
                  style={styles.joinButton}
                  disabled={joiningGroupId === group.id}
                >
                  {joiningGroupId === group.id ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    'Request to Join'
                  )}
                </Button>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        style={{ backgroundColor: snackbarColor }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'column',
    gap: 12,
  },
  searchBar: {
    elevation: 2,
  },
  searchButton: {
    alignSelf: 'center',
    minWidth: 120,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
  },
  groupCard: {
    marginBottom: 16,
    elevation: 2,
  },
  description: {
    marginTop: 8,
    marginBottom: 12,
    color: '#666',
  },
  chipContainer: {
    marginVertical: 8,
  },
  inviteChip: {
    backgroundColor: '#e3f2fd',
  },
  joinButton: {
    marginTop: 10,
  },
});

export default JoinGroupScreen;
