// Utility functions to transform backend error messages into user-friendly messages

export const transformErrorMessage = (error: any): string => {
  if (!error || typeof error !== 'object') {
    return 'An unexpected error occurred. Please try again.';
  }

  const errorMessage = error.message || error.error || '';
  
  // Transform specific error messages to be more user-friendly
  if (errorMessage.includes('you must be a project member to edit this project')) {
    return "You are not a member of this project! You cannot edit project details. Ask a project member to add you to the project.";
  }
  
  if (errorMessage.includes('you must be a project member to modify checklist items')) {
    return "You are not a member of this project! You cannot modify checklist items. Ask a project member to add you to the project.";
  }
  
  if (errorMessage.includes('you must be a project member to upload files')) {
    return "You are not a member of this project! You cannot upload files. Ask a project member to add you to the project.";
  }
  
  if (errorMessage.includes('you must be a project member to delete files')) {
    return "You are not a member of this project! You cannot delete files. Ask a project member to add you to the project.";
  }
  
  if (errorMessage.includes('you must be a project member to manage project members')) {
    return "You are not a member of this project! You cannot manage project members. Ask a project member to add you to the project.";
  }
  
  if (errorMessage.includes('Access denied') && errorMessage.includes('project member')) {
    return "You are not a member of this project! You cannot perform this action. Ask a project member to add you to the project.";
  }
  
  if (errorMessage.includes('User is already assigned to this project')) {
    return "This user is already a member of the project.";
  }
  
  if (errorMessage.includes('User must be a member of the group')) {
    return "Only members of this research group can be added to projects.";
  }
  
  if (errorMessage.includes('Cannot remove the project creator when they are the only member')) {
    return "Cannot remove the project creator when they are the only member. Add another member first.";
  }
  
  if (errorMessage.includes('Failed to') || errorMessage.includes('failed')) {
    // Extract the action that failed and make it more specific
    if (errorMessage.includes('update project')) {
      return "Failed to update project details. Please check your connection and try again.";
    }
    if (errorMessage.includes('add checklist item') || errorMessage.includes('create checklist item')) {
      return "Failed to add checklist item. Please check your connection and try again.";
    }
    if (errorMessage.includes('update checklist item')) {
      return "Failed to update checklist item. Please check your connection and try again.";
    }
    if (errorMessage.includes('delete checklist item')) {
      return "Failed to delete checklist item. Please check your connection and try again.";
    }
    if (errorMessage.includes('upload file')) {
      return "Failed to upload file. Please check your connection and file size, then try again.";
    }
    if (errorMessage.includes('delete file')) {
      return "Failed to delete file. Please check your connection and try again.";
    }
    if (errorMessage.includes('add member') || errorMessage.includes('assign user')) {
      return "Failed to add member to project. Please check your connection and try again.";
    }
    if (errorMessage.includes('remove member') || errorMessage.includes('remove user')) {
      return "Failed to remove member from project. Please check your connection and try again.";
    }
  }
  
  // If no specific transformation applies, return the original message
  return errorMessage || 'An unexpected error occurred. Please try again.';
};

export const getActionName = (errorMessage: string): string => {
  if (errorMessage.includes('edit this project')) return 'edit project details';
  if (errorMessage.includes('modify checklist items')) return 'modify checklist items';
  if (errorMessage.includes('upload files')) return 'upload files';
  if (errorMessage.includes('delete files')) return 'delete files';
  if (errorMessage.includes('manage project members')) return 'manage project members';
  return 'perform this action';
};