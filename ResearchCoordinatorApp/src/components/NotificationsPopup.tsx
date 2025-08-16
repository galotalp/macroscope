import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native'
import { 
  Dialog,
  Portal,
  Card,
  Button,
  IconButton,
  Chip,
  ActivityIndicator
} from 'react-native-paper'
import SupabaseService from '../services/supabaseService'
import { theme } from '../theme'
import { PendingInvitation } from '../types'

interface JoinRequest {
  id: string
  user_id: string
  username: string
  email: string
  bio?: string
  profile_picture?: string
  requested_at: string
  group_id: string
  group_name: string
}

interface NotificationItem {
  id: string
  type: 'invitation' | 'join_request'
  title: string
  message: string
  timestamp: string
  data: PendingInvitation | JoinRequest
}

interface NotificationsPopupProps {
  visible: boolean
  onDismiss: () => void
  onNotificationHandled: () => void
}

export default function NotificationsPopup({ 
  visible, 
  onDismiss, 
  onNotificationHandled 
}: NotificationsPopupProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  const screenHeight = Dimensions.get('window').height

  useEffect(() => {
    if (visible) {
      loadNotifications()
    }
  }, [visible])

  // Auto-dismiss popup when no notifications remain
  useEffect(() => {
    if (visible && !loading && notifications.length === 0) {
      // Small delay to avoid jarring immediate close
      const timer = setTimeout(() => {
        onDismiss()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [visible, loading, notifications.length, onDismiss])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      // Load both invitations and join requests
      const [invitations, joinRequestCounts] = await Promise.all([
        SupabaseService.getPendingInvitations(),
        SupabaseService.getPendingJoinRequestCounts()
      ])

      const notificationItems: NotificationItem[] = []

      // Add invitations
      invitations.forEach((invitation: PendingInvitation) => {
        notificationItems.push({
          id: `invitation_${invitation.id}`,
          type: 'invitation',
          title: `Invitation to ${invitation.group_name}`,
          message: `${invitation.inviter_username} invited you to join this group`,
          timestamp: invitation.invited_at,
          data: invitation
        })
      })

      // Add join requests (we need to fetch detailed join requests)
      if (joinRequestCounts.groupCounts && joinRequestCounts.groupCounts.length > 0) {
        for (const groupCount of joinRequestCounts.groupCounts) {
          if (groupCount.pendingRequestsCount > 0) {
            try {
              const requests = await SupabaseService.getPendingJoinRequests(groupCount.groupId)
              requests.forEach((request: any) => {
                notificationItems.push({
                  id: `join_request_${request.id}`,
                  type: 'join_request',
                  title: `Join request for ${groupCount.groupName || 'your group'}`,
                  message: `${request.username} wants to join this group`,
                  timestamp: request.requested_at,
                  data: {
                    ...request,
                    group_id: groupCount.groupId,
                    group_name: groupCount.groupName
                  }
                })
              })
            } catch (error) {
              console.error('Error loading join requests for group:', groupCount.groupId, error)
            }
          }
        }
      }

      // Sort by timestamp (newest first)
      notificationItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      
      setNotifications(notificationItems)
    } catch (error) {
      console.error('Error loading notifications:', error)
      Alert.alert('Error', 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  const handleInvitationAction = async (invitation: PendingInvitation, action: 'accept' | 'decline') => {
    const notificationId = `invitation_${invitation.id}`
    if (processingIds.has(notificationId)) return

    setProcessingIds(prev => new Set(prev.add(notificationId)))

    try {
      // Check if this is a regular invitation (no token) or email invitation (has token)
      if (invitation.invitation_token) {
        // Email invitation - use token-based methods
        if (action === 'accept') {
          await SupabaseService.acceptInvitation(invitation.invitation_token)
          Alert.alert('Success!', `You've joined ${invitation.group_name}`)
        } else {
          await SupabaseService.declineInvitation(invitation.invitation_token)
        }
      } else {
        // Regular invitation - use ID-based methods
        if (action === 'accept') {
          await SupabaseService.acceptRegularInvitation(invitation.id)
          Alert.alert('Success!', `You've joined ${invitation.group_name}`)
        } else {
          await SupabaseService.declineRegularInvitation(invitation.id)
        }
      }

      // Remove this notification from the list
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      onNotificationHandled()

    } catch (error: any) {
      console.error('Error handling invitation:', error)
      Alert.alert('Error', error.message || `Failed to ${action} invitation`)
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(notificationId)
        return newSet
      })
    }
  }

  const handleJoinRequestAction = async (request: JoinRequest, action: 'approve' | 'reject') => {
    const notificationId = `join_request_${request.id}`
    if (processingIds.has(notificationId)) return

    setProcessingIds(prev => new Set(prev.add(notificationId)))

    try {
      await SupabaseService.respondToJoinRequest(request.group_id, request.id, action)
      
      Alert.alert(
        'Success!', 
        action === 'approve' 
          ? `${request.username} has been added to the group`
          : `${request.username}'s request has been rejected`
      )

      // Remove this notification from the list
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      onNotificationHandled()

    } catch (error: any) {
      console.error('Error handling join request:', error)
      Alert.alert('Error', error.message || `Failed to ${action} request`)
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(notificationId)
        return newSet
      })
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const renderNotification = ({ item }: { item: NotificationItem }) => {
    const isProcessing = processingIds.has(item.id)

    return (
      <Card style={styles.notificationCard}>
        <Card.Content>
          <View style={styles.notificationHeader}>
            <View style={styles.notificationTitleRow}>
              <Chip 
                mode="flat"
                style={[
                  styles.typeChip,
                  item.type === 'invitation' ? styles.invitationChip : styles.joinRequestChip
                ]}
                textStyle={styles.chipText}
              >
                {item.type === 'invitation' ? 'Invitation' : 'Join Request'}
              </Chip>
              <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>
            </View>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            <Text style={styles.notificationMessage}>{item.message}</Text>
          </View>

          {item.type === 'invitation' && (
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                onPress={() => handleInvitationAction(item.data as PendingInvitation, 'accept')}
                disabled={isProcessing}
                loading={isProcessing}
                style={[styles.actionButton, styles.acceptButton]}
                labelStyle={styles.buttonLabel}
              >
                Accept
              </Button>
              <Button
                mode="outlined"
                onPress={() => handleInvitationAction(item.data as PendingInvitation, 'decline')}
                disabled={isProcessing}
                style={[styles.actionButton, styles.declineButton]}
                labelStyle={styles.declineButtonLabel}
              >
                Decline
              </Button>
            </View>
          )}

          {item.type === 'join_request' && (
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                onPress={() => handleJoinRequestAction(item.data as JoinRequest, 'approve')}
                disabled={isProcessing}
                loading={isProcessing}
                style={[styles.actionButton, styles.acceptButton]}
                labelStyle={styles.buttonLabel}
              >
                Approve
              </Button>
              <Button
                mode="outlined"
                onPress={() => handleJoinRequestAction(item.data as JoinRequest, 'reject')}
                disabled={isProcessing}
                style={[styles.actionButton, styles.declineButton]}
                labelStyle={styles.declineButtonLabel}
              >
                Reject
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>
    )
  }

  return (
    <Portal>
      <Dialog 
        visible={visible} 
        onDismiss={onDismiss}
        style={[styles.dialog, { maxHeight: screenHeight * 0.8 }]}
      >
        <Dialog.Title style={styles.dialogTitle}>
          <View style={styles.titleRow}>
            <Text style={styles.titleText}>Notifications</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={onDismiss}
              style={styles.closeButton}
            />
          </View>
        </Dialog.Title>

        <Dialog.Content style={styles.dialogContent}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No notifications</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              renderItem={renderNotification}
              showsVerticalScrollIndicator={true}
              style={styles.notificationsList}
            />
          )}
        </Dialog.Content>
      </Dialog>
    </Portal>
  )
}

const styles = StyleSheet.create({
  dialog: {
    marginHorizontal: 20,
    borderRadius: 12,
  },
  dialogTitle: {
    paddingBottom: 0,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  closeButton: {
    margin: 0,
  },
  dialogContent: {
    paddingHorizontal: 0,
    maxHeight: 500,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  notificationsList: {
    paddingHorizontal: 16,
  },
  notificationCard: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  notificationHeader: {
    marginBottom: 12,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeChip: {
    height: 32,
    paddingHorizontal: 12,
    minWidth: 90,
  },
  invitationChip: {
    backgroundColor: '#e3f2fd',
  },
  joinRequestChip: {
    backgroundColor: '#f3e5f5',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
  },
  declineButton: {
    borderColor: '#999',
  },
  buttonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  declineButtonLabel: {
    color: '#666',
    fontWeight: '600',
  },
})