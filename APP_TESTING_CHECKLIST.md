# App Testing Checklist 📋

## 🔐 Authentication & User Management
- [y] **Registration**: Create new account with email/password
- [y] **Email Verification**: Check email and verify account
- [y] **Login**: Sign in with verified credentials
- [ ] **Password Reset**: Request and complete password reset flow
- [ ] **Profile Updates**: Edit bio, upload profile picture
- [ ] **Logout**: Sign out and ensure session is cleared

## 👥 Research Groups
- [ ] **Create Group**: Make new research group
- [ ] **Join Group**: Request to join existing group
- [ ] **Group Admin Features**:
  - [ ] Accept/reject join requests
  - [ ] View pending requests (should show user details, not "Unknown User")
  - [ ] Remove group members
  - [ ] Edit group settings
- [ ] **Group Member Features**:
  - [ ] View group projects
  - [ ] Access group files
  - [ ] See other group members

## 📊 Projects - Priority System (NEW FEATURES)
- [ ] **Priority Sections Display**:
  - [ ] High Priority section (red tint) shows at top
  - [ ] Medium Priority section (yellow tint) shows second
  - [ ] Low Priority section (green tint) shows third
  - [ ] **Completed Priority section (blue tint) shows at bottom** ⭐
- [ ] **Project Creation**: Create projects with different priorities
- [ ] **Priority Editing**: 
  - [ ] Change existing project to "Completed" priority
  - [ ] **Verify "Save" works without database constraint error** ⭐
  - [ ] Change from Completed back to other priorities
- [ ] **File Count Column**: Verify Files column shows correct count (not Priority)

## 📁 File Management 
- [ ] **File Upload**: Upload various file types to projects
- [ ] **File Download**: Download uploaded files
- [ ] **File Deletion**: Delete files from projects
- [ ] **File Count**: Verify count updates in projects table
- [ ] **File Sorting**: Test sort by date, name, type

## ✅ Project Features
- [ ] **Project Creation**: Create new projects in groups
- [ ] **Project Editing**: Edit project name, description, notes
- [ ] **Project Deletion**: Delete projects (admin only)
- [ ] **Checklist Items**:
  - [ ] Add checklist items
  - [ ] Mark items as complete/incomplete
  - [ ] Delete checklist items
- [ ] **Team Members**:
  - [ ] Add members to projects
  - [ ] Remove members from projects
  - [ ] **Verify Team Members section appears at bottom** ⭐

## 🔄 Member Management (Critical Fixes)
- [ ] **Group Member Removal**: 
  - [ ] Remove member from group as admin
  - [ ] **Verify member actually gets removed** (not just "success" message)
  - [ ] **Verify member gets removed from all group projects automatically** ⭐
- [ ] **Rejoin After Removal**:
  - [ ] User removed from group can request to rejoin
  - [ ] **No "duplicate constraint" error when requesting again** ⭐

## 🎨 UI/UX Testing
- [ ] **Priority Color Coding**: All priority sections have correct colors
- [ ] **Section Headers**: Each priority section shows correct count
- [ ] **Responsive Layout**: Priority buttons wrap properly in edit mode
- [ ] **File-Centric Design**: Files prominently displayed throughout
- [ ] **Navigation**: Smooth transitions between screens
- [ ] **Loading States**: Proper loading indicators
- [ ] **Error Handling**: Meaningful error messages

## 🔍 Data Integrity
- [ ] **Project Counts**: Verify task completion counts are accurate
- [ ] **Member Counts**: Verify member counts in projects table
- [ ] **File Counts**: Verify file counts match actual uploaded files
- [ ] **Priority Ordering**: Projects appear in correct priority order
- [ ] **Refresh Data**: Pull-to-refresh works on all screens

## 🚨 Critical Scenarios (Previously Fixed Issues)
- [ ] **Password Input**: 
  - [ ] No "Automatic strong password" overlay blocking input
  - [ ] Show/hide password toggle works
- [ ] **Profile Updates**: UpdateProfile method works (not "function undefined")
- [ ] **Join Requests**: Group admins see requester details, not "Unknown User"
- [ ] **Cascading Removal**: Removing from group removes from projects too
- [ ] **Database Constraints**: Completed priority saves without errors

## 📱 Cross-Platform Testing
- [ ] **iOS**: Test on iPhone/iPad if available
- [ ] **Android**: Test on Android device if available
- [ ] **Different Screen Sizes**: Test responsive layout

## 🔐 Security Testing
- [ ] **Unauthorized Access**: Can't access groups you're not member of
- [ ] **Admin Functions**: Only admins can remove members, delete projects
- [ ] **Data Privacy**: Can only see profiles of group members
- [ ] **Session Management**: Proper logout clears authentication

---

## 🎯 Test Priority Order
1. **HIGH PRIORITY**: Test completed priority feature and database saves ⭐
2. **HIGH PRIORITY**: Test member removal and cascading project removal ⭐ 
3. **MEDIUM**: Test file-centric UI and priority sections
4. **MEDIUM**: Test basic project/group functionality
5. **LOW**: Test edge cases and cross-platform compatibility

## 📝 How to Test
1. Go through each checkbox systematically
2. Mark ✅ for passed tests, ❌ for failed tests
3. Note any issues or unexpected behavior
4. Test edge cases (empty states, large files, long text)
5. Try to break things intentionally

## 🐛 If You Find Issues
- Note the exact steps to reproduce
- Check browser/app console for error messages
- Try the same action multiple times to confirm consistency
- Test on different devices/browsers if possible

---

**Focus Areas**: Completed priority feature, member management fixes, file-centric UI improvements