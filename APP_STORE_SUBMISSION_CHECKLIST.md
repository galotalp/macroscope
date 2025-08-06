# 📱 App Store Submission Checklist for MacroScope

## Overview
This checklist covers all requirements and steps needed to submit MacroScope to the Apple App Store.

---

## ✅ 1. Apple Developer Account Setup
- [ ] Enroll in Apple Developer Program ($99/year)
- [ ] Complete tax forms and banking information
- [ ] Set up App Store Connect access
- [ ] Add team members if needed

---

## 🔧 2. App Configuration & Technical Requirements
- [ ] Set unique Bundle ID (current: `com.macroscope.app`)
- [ ] Configure app version (start with 1.0.0)
- [ ] Generate App Store provisioning profile
- [ ] Create App Store distribution certificate
- [ ] Configure push notification certificates (if needed)
- [ ] Set minimum iOS version (currently iOS 13.4)
- [ ] Remove all development/debug code
- [ ] Ensure no test data or credentials in code
- [ ] Disable development/debug logging
- [ ] Remove any beta/test features

---

## 📝 3. App Store Connect Setup
- [ ] Create new app in App Store Connect
- [ ] Fill in app information:
  - [ ] App name: "MacroScope"
  - [ ] Primary language: English
  - [ ] Bundle ID selection
  - [ ] SKU (unique identifier, e.g., "MACROSCOPE001")
  - [ ] User access (Full Access or Limited Access)

---

## 📄 4. App Metadata & Store Listing
- [ ] **App Name**: MacroScope
- [ ] **Subtitle** (30 characters): "Research Team Collaboration"
- [ ] **App Description** (up to 4,000 characters) - Focus on:
  - Research group management
  - Project collaboration
  - File sharing capabilities
  - Task management features
- [ ] **Promotional Text** (170 characters) - For updates without new version
- [ ] **Keywords** (100 characters, comma-separated):
  - Example: "research,collaboration,academic,projects,team,management,university,science,files,tasks"
- [ ] **Support URL**: https://macroscope.info/support
- [ ] **Marketing URL**: https://macroscope.info (optional)
- [ ] **App Category**: 
  - Primary: Productivity
  - Secondary: Education (optional)
- [ ] **Age Rating Questionnaire** - Answer honestly about:
  - Medical/treatment information
  - Profanity or crude humor
  - User-generated content
  - Account creation
- [ ] **Copyright**: "© 2025 MacroScope"

---

## 🎨 5. Visual Assets Required
### App Icon
- [ ] 1024x1024px PNG without alpha channel/transparency
- [ ] No text in icon (Apple guideline)
- [ ] Follow Apple Human Interface Guidelines

### Screenshots (Required for each size)
#### iPhone Screenshots (Upload up to 10)
- [ ] **iPhone 6.7"** - 1290 x 2796px (iPhone 15 Pro Max)
- [ ] **iPhone 6.5"** - 1284 x 2778px or 1242 x 2688px (iPhone 14 Plus)
- [ ] **iPhone 5.5"** - 1242 x 2208px (iPhone 8 Plus)

#### Recommended Screenshots to Include:
1. [ ] Login/Welcome screen
2. [ ] Research Groups overview
3. [ ] Project details view
4. [ ] File management screen
5. [ ] Task checklist feature
6. [ ] User profile/settings

### App Preview Video (Optional but Recommended)
- [ ] 15-30 seconds
- [ ] Show key features in action
- [ ] Include captions
- [ ] No pricing information

---

## ⚖️ 6. Legal Requirements
- [ ] **Privacy Policy URL** (Required)
  - Current file: `/PRIVACY_POLICY.md`
  - Must be hosted at: https://macroscope.info/privacy
- [ ] **Terms of Service URL** (Recommended)
  - Current file: `/TERMS_OF_SERVICE.md`
  - Host at: https://macroscope.info/terms
- [ ] **Export Compliance**
  - Uses encryption: Yes (HTTPS/TLS)
  - Exempt from export regulations (uses standard encryption)
- [ ] **Content Rights**
  - Confirm ownership of all images/assets
  - Third-party licenses documented

---

## 🧪 7. Testing & Quality Assurance
### Device Testing
- [ ] Test on real iPhone devices (not just simulator)
- [ ] Test on different iOS versions (minimum iOS 13.4+)
- [ ] Test on different screen sizes

### Feature Testing
- [ ] User registration and email verification
- [ ] Login/logout flow
- [ ] Password reset functionality
- [ ] Create/join research groups
- [ ] Project creation and management
- [ ] File upload/download
- [ ] Task checklist functionality
- [ ] Profile picture upload
- [ ] Push notifications (if applicable)
- [ ] Offline mode behavior
- [ ] Network error handling

### Performance Testing
- [ ] App launch time < 2 seconds
- [ ] Smooth scrolling and animations
- [ ] Memory usage optimization
- [ ] No memory leaks
- [ ] Battery usage reasonable

### Accessibility
- [ ] VoiceOver support
- [ ] Dynamic Type support
- [ ] Color contrast compliance

---

## 🔒 8. Backend & Infrastructure Checklist
- [ ] **AWS EC2 Instance** (Currently: 18.213.201.127)
  - [ ] Configured for production load
  - [ ] Auto-scaling setup (if needed)
  - [ ] Monitoring with CloudWatch
  
- [ ] **AWS SES Email Service**
  - [ ] Move out of sandbox mode (IMPORTANT!)
  - [ ] Verify sending domain (macroscope.info)
  - [ ] Set up bounce/complaint handling
  
- [ ] **Database (Supabase)**
  - [ ] Backup strategy implemented
  - [ ] Row Level Security (RLS) enabled
  - [ ] Connection pooling configured
  
- [ ] **API Security**
  - [ ] Rate limiting configured
  - [ ] CORS properly set
  - [ ] JWT tokens secure
  - [ ] HTTPS enforced
  
- [ ] **Monitoring**
  - [ ] Error tracking (e.g., Sentry)
  - [ ] Uptime monitoring
  - [ ] Performance metrics

---

## 🏗️ 9. Build Preparation in Xcode
- [ ] Set build configuration to "Release"
- [ ] Update version number and build number
- [ ] Select "Generic iOS Device" or connected device
- [ ] Product → Clean Build Folder
- [ ] Product → Archive
- [ ] Validate archive in Organizer
- [ ] Upload to App Store Connect
- [ ] Wait for processing (15-30 minutes)

---

## 📤 10. App Review Submission
### Before Submission
- [ ] Select the build in App Store Connect
- [ ] Set app version release options:
  - [ ] Manually release after approval
  - [ ] OR automatically release after approval

### Review Information
- [ ] **Demo Account** (Required for apps with login):
  ```
  Username: apple_reviewer
  Email: reviewer@test.com
  Password: [Create specific test account]
  ```
- [ ] **Notes for Reviewer**:
  ```
  This app requires email verification. The test account provided 
  is pre-verified. Main features include research group management, 
  project collaboration, and file sharing for academic teams.
  ```
- [ ] **Contact Information**:
  - Email
  - Phone number

### Export Compliance
- [ ] Answer encryption questions
- [ ] Select appropriate export compliance option

### Submit for Review
- [ ] Review all information
- [ ] Submit to Apple Review
- [ ] Expected review time: 24-48 hours

---

## 📊 11. Post-Submission Tasks
- [ ] Monitor review status in App Store Connect
- [ ] Set up email notifications for status changes
- [ ] Prepare responses for potential rejection reasons
- [ ] Plan for quick turnaround if changes needed
- [ ] Set up App Analytics in App Store Connect
- [ ] Configure crash reporting

---

## 🚀 12. Marketing & Launch Preparation
### Pre-Launch
- [ ] Create landing page on macroscope.info
- [ ] Set up email list for interested users
- [ ] Prepare press kit with:
  - [ ] App description
  - [ ] Screenshots
  - [ ] Logo assets
  - [ ] Feature list

### Launch Strategy
- [ ] Social media accounts created
- [ ] Launch announcement prepared
- [ ] Reach out to:
  - [ ] University research departments
  - [ ] Academic communities
  - [ ] Research coordination forums
- [ ] Consider Product Hunt launch
- [ ] Create demo video for website

### Post-Launch
- [ ] Monitor user reviews
- [ ] Respond to feedback
- [ ] Plan update schedule
- [ ] Track analytics and KPIs

---

## 🚨 13. Common Rejection Reasons to Avoid
- [ ] Crashes or bugs during review
- [ ] Placeholder content
- [ ] Broken links in app or metadata
- [ ] Inadequate testing on actual devices
- [ ] Privacy policy not accessible or incomplete
- [ ] Demo account not working
- [ ] Features that don't work as described
- [ ] Using private APIs
- [ ] Misleading app description
- [ ] Not following Apple's Human Interface Guidelines

---

## 📅 14. Timeline Estimate
- **Week 1**: Account setup, legal documents, metadata preparation
- **Week 2**: Screenshot creation, testing, bug fixes
- **Week 3**: Build submission, review process
- **Week 4**: Address feedback, launch preparation

---

## 🔄 15. Future Updates Checklist
For each update after initial release:
- [ ] Update version number
- [ ] Write "What's New" section
- [ ] Update screenshots if UI changed
- [ ] Test upgrade path from previous version
- [ ] Update marketing materials
- [ ] Plan phased rollout strategy

---

## 📞 Important Links & Resources
- [App Store Connect](https://appstoreconnect.apple.com)
- [Apple Developer Portal](https://developer.apple.com)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)

---

## 📝 Notes Section
Use this space to track specific decisions, feedback, or important information:

### Current Status:
- Bundle ID: `com.macroscope.app`
- Backend: https://api.macroscope.info
- EC2 Instance: 18.213.201.127
- Email verification: ✅ Working

### Test Accounts Created:
- [ ] Create dedicated Apple reviewer account
- [ ] Document test scenarios

### Feedback/Issues:
- (Add any feedback from beta testers or review process here)

---

*Last Updated: August 6, 2025*
*Remember to update this checklist as you complete items and learn from the submission process.*