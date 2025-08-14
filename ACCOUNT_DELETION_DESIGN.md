# Account Deletion Feature Design

## Overview

This document outlines the design and implementation plan for the account deletion feature, required by the App Store for user data management compliance.

## Problem Statement

When a user deletes their account, we need to handle their data responsibly while minimizing disruption to other users. Key challenges:

1. **Groups**: User may be the only admin of groups with other members
2. **Projects**: User may have created projects that other members depend on
3. **Data Integrity**: Foreign key constraints must be maintained
4. **User Experience**: Clear warnings and transfer options needed

## Design Decisions

### Philosophy
- **User Control**: Users decide whether to transfer ownership or delete resources
- **Minimal Disruption**: Other users can continue their work uninterrupted
- **Data Integrity**: No orphaned resources or broken references
- **Clear Communication**: Users understand exactly what will happen

### Current Database Constraints
- Groups: `created_by UUID REFERENCES users(id) ON DELETE CASCADE`
- Projects: `created_by UUID REFERENCES users(id) ON DELETE CASCADE`
- Project Checklist Items: `created_by UUID REFERENCES users(id) ON DELETE CASCADE`

**Issue**: CASCADE delete would remove all groups and projects created by the user, even if other members are actively using them.

## Solution: Three-Tier Deletion Flow

### Tier 1: Solo Resources (Safe to Delete)
Resources where the user is the only participant:
- **Groups with only this user** → Delete completely
- **Projects in solo groups** → Delete completely
- **Personal data** (profile, bio, avatar) → Delete completely
- **Files uploaded by user in solo projects** → Delete completely

### Tier 2: Shared Resources (Require Transfer)
Resources with other active participants:
- **Groups where user is admin + has other members** → Require admin transfer
- **Projects created by user in multi-member groups** → Transfer to new group admin
- **Checklist items created by user** → Transfer to new admin

### Tier 3: Membership Only (Simple Removal)
Resources where user is just a participant:
- **Groups where user is a member (not admin)** → Remove membership
- **Projects where user is assigned but not creator** → Remove assignment
- **Files uploaded by user in shared projects** → Keep files, set `uploaded_by` to NULL

## Implementation Plan

### Phase 1: Database Changes

#### 1.1 Update Foreign Key Constraints
```sql
-- Allow NULL values for created_by fields when needed
ALTER TABLE projects 
DROP CONSTRAINT projects_created_by_fkey,
ADD CONSTRAINT projects_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES users(id) 
  ON DELETE SET NULL;

ALTER TABLE project_checklist_items
DROP CONSTRAINT project_checklist_items_created_by_fkey,
ADD CONSTRAINT project_checklist_items_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id)
  ON DELETE SET NULL;
```

#### 1.2 Create Transfer Functions
```sql
-- Function to analyze user's deletion impact
CREATE OR REPLACE FUNCTION analyze_user_deletion(target_user_id UUID) 
RETURNS TABLE(
  solo_groups JSON,
  admin_groups JSON,
  member_groups JSON,
  created_projects JSON
) AS $$
BEGIN
  -- Return categorized groups and projects
  -- Implementation details in separate migration file
END;
$$ LANGUAGE plpgsql;

-- Function to transfer group ownership
CREATE OR REPLACE FUNCTION transfer_group_ownership(
  target_group_id UUID,
  old_admin_id UUID,
  new_admin_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Validate new admin is a group member
  -- Update group admin role
  -- Transfer all projects in group created by old admin
  -- Update old admin to member role
END;
$$ LANGUAGE plpgsql;

-- Function to safely delete user account
CREATE OR REPLACE FUNCTION delete_user_account(
  target_user_id UUID,
  transfer_mappings JSON -- Group ID -> New Admin ID mappings
) RETURNS VOID AS $$
BEGIN
  -- Execute transfers first
  -- Delete solo groups and projects
  -- Remove user memberships
  -- Delete user profile
  -- Delete auth user
END;
$$ LANGUAGE plpgsql;
```

### Phase 2: Frontend Implementation

#### 2.1 Account Deletion Analysis
```typescript
interface DeletionAnalysis {
  soloGroups: Group[];
  adminGroups: Group[];
  memberGroups: Group[];
  projectsToTransfer: Project[];
  canDeleteImmediately: boolean;
}

const analyzeAccountDeletion = async (): Promise<DeletionAnalysis> => {
  // Call database function to analyze user's resources
};
```

#### 2.2 UI Components

**DeleteAccountScreen**
- Initial analysis and overview
- Warning about data that will be deleted
- Option to proceed or cancel

**GroupTransferScreen**
- List of groups requiring admin transfer
- Member selector for each group
- Preview of projects that will be transferred
- Continue/cancel options

**DeletionConfirmationScreen**
- Final summary of all actions
- Type "DELETE" confirmation
- Execute deletion

#### 2.3 User Flow
```
1. Settings → Delete Account
2. System Analysis:
   - Solo groups: 2 (will be deleted)
   - Admin groups with members: 3 (need transfer)
   - Member-only groups: 1 (will leave)
3. Transfer Required:
   - "Research Lab" → Choose new admin from [Alice, Bob, Charlie]
   - "Project Team Alpha" → Choose new admin from [Diana, Eve]
   - "Beta Testing Group" → Choose new admin from [Frank, Grace]
4. Transfer Preview:
   - 5 projects will transfer ownership
   - 12 checklist items will transfer
   - Files will remain accessible
5. Final Confirmation:
   - Type "DELETE" to confirm
   - Warning: "This action cannot be undone"
6. Execution:
   - Transfer ownerships
   - Delete solo resources
   - Remove memberships
   - Delete account
```

### Phase 3: Safety Features

#### 3.1 Validation Rules
- New admin must be existing group member
- Cannot transfer to user who is deleting account
- Must handle all admin groups before deletion
- Atomic transaction for all operations

#### 3.2 User Communication
- Email notifications to new admins
- Summary of transferred resources
- 24-hour delay option for reconsideration
- Export user data before deletion

#### 3.3 Error Handling
- Rollback on any transfer failure
- Clear error messages for invalid selections
- Retry mechanism for network issues
- Graceful degradation if services unavailable

## Technical Considerations

### Database Transactions
- All transfers and deletions in single transaction
- Rollback on any failure
- Foreign key constraint validation
- Cascade effect management

### Performance
- Batch operations for large datasets
- Progress indicators for long operations
- Background processing for actual deletion
- Rate limiting to prevent abuse

### Security
- Additional password confirmation
- Email verification for deletion request
- Audit logging of all transfers
- Prevention of malicious transfers

## Testing Strategy

### Test Scenarios
1. **Solo user deletion** - User with only solo groups
2. **Admin with transfers** - User admin of multiple groups
3. **Member only deletion** - User not admin of any groups
4. **Mixed scenario** - User with solo groups + admin groups + member groups
5. **Edge cases** - Empty groups, single-project groups, etc.

### Validation Tests
- Data integrity after transfers
- UI flow completeness
- Error handling robustness
- Performance under load
- Security boundary testing

## Implementation Timeline

### Week 1
- Database schema updates
- SQL function implementation
- Basic UI wireframes

### Week 2
- Frontend components development
- API integration
- Initial testing

### Week 3
- UI polish and user experience
- Comprehensive testing
- Documentation completion

### Week 4
- Final testing and bug fixes
- App Store submission preparation
- Production deployment

## Success Criteria

- ✅ App Store approval for data deletion compliance
- ✅ Zero data orphaning after account deletion
- ✅ No disruption to other users' workflows
- ✅ Clear and intuitive user experience
- ✅ Robust error handling and recovery
- ✅ Complete audit trail of transfers

## Future Enhancements

- **Grace Period**: 30-day account recovery option
- **Data Export**: Download all user data before deletion
- **Bulk Transfer**: Select one person for all group transfers
- **Notification System**: Alert affected users of ownership changes
- **Analytics**: Track deletion patterns and reasons

---

*Last Updated: [Current Date]*
*Status: Design Phase*
*Next Phase: Database Implementation*