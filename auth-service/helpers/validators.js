// helpers/validators.js

// Validate Name
export const validateName = (name) => {
  if (!name || name.trim().length === 0) return "Name is required.";
  if (name.length > 50) return "Name cannot exceed 50 characters.";
  return null;
};

// Validate Username
export const validateUsername = (username) => {
  if (!username) return "Username is required.";
  if (username.length < 3) return "Username must be at least 3 characters.";
  if (username.length > 20) return "Username cannot exceed 20 characters.";
  if (!/^[a-zA-Z0-9_]+$/.test(username))
    return "Username can only contain letters, numbers, and underscores.";
  return null;
};

// Validate Bio (optional)
export const validateBio = (bio) => {
  if (!bio) return null; // bio is optional
  if (bio.length > 200) return "Bio cannot exceed 200 characters.";
  return null;
};

// Validate URL (optional)
export const validateURL = (url) => {
  if (!url) return null; // if empty, skip
  try {
    new URL(url);
    return null;
  } catch {
    return "Invalid URL format.";
  }
};

// Validate Social Links (object with multiple platforms)
export const validateSocialLinks = (socialLinks = {}) => {
  const errors = {};
  Object.keys(socialLinks).forEach((key) => {
    const error = validateURL(socialLinks[key]);
    if (error) errors[key] = `${key}: ${error}`;
  });
  return Object.keys(errors).length > 0 ? errors : null;
};
