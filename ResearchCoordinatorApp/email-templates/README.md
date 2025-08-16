# Email Templates for Supabase

This folder contains HTML email templates for MacroScope that should be configured in the Supabase dashboard.

## How to Update Supabase Email Templates

1. **Go to your Supabase Dashboard**
   - Navigate to: `Authentication` > `Email Templates`

2. **Update the "Confirm signup" template**
   - Copy the content from `confirm-signup-template.html`
   - Paste it into the "Confirm signup" template field
   - Make sure to keep the `{{ .ConfirmationURL }}` placeholder

3. **Update the "Reset password" template**
   - Copy the content from `reset-password-template.html`
   - Paste it into the "Reset password" template field
   - Make sure to keep the `{{ .ConfirmationURL }}` placeholder

## Template Features

✅ **MacroScope Branding**: Logo and brand colors
✅ **Responsive Design**: Works on mobile and desktop
✅ **Professional Styling**: Clean, modern appearance
✅ **Consistent with Invitation Emails**: Matches the invitation email design

## Changes Made to Invitation Email

- ✅ Removed "By signing up, you'll automatically be added to the group" text
- ✅ Updated branding from "Research Coordinator" to "MacroScope"
- ✅ Added MacroScope icon/logo
- ✅ Updated all text references to use "MacroScope" instead of "Research Coordinator"

## Notes

- The MacroScope icon is loaded from `https://macroscope.info/assets/macroscope-icon.png`
- If this URL doesn't exist, you may need to upload the icon to your website
- All templates use the same green color scheme (#6fa172) for consistency