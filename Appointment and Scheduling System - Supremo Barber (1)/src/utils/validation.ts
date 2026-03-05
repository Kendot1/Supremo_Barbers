/**
 * Form Validation Utilities
 * Provides comprehensive validation rules for all forms in the application
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ==================== VALIDATION RULES ====================

/**
 * Email validation
 */
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }

  // Check for spaces in email
  if (email.includes(' ')) {
    return { isValid: false, error: 'Email should not contain spaces' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true };
};

/**
 * Password validation with strong requirements
 */
export const validatePassword = (password: string, fieldName: string = 'Password'): { isValid: boolean; error?: string } => {
  if (!password || password.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (password.length < 8) {
    return { isValid: false, error: `${fieldName} must be at least 8 characters long` };
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: `${fieldName} must contain at least one uppercase letter` };
  }

  // Check for at least one digit
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: `${fieldName} must contain at least one digit` };
  }

  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, error: `${fieldName} must contain at least one special character` };
  }

  return { isValid: true };
};

/**
 * Phone number validation (Philippine format)
 */
export const validatePhone = (phone: string, required: boolean = true): { isValid: boolean; error?: string } => {
  if (!phone || phone.trim() === '') {
    if (required) {
      return { isValid: false, error: 'Phone number is required' };
    }
    return { isValid: true };
  }

  // Remove all non-digit characters for counting
  const digitsOnly = phone.replace(/\D/g, '');

  // Must be exactly 11 digits
  if (digitsOnly.length !== 11) {
    return { isValid: false, error: 'Phone number must be exactly 11 digits' };
  }

  // Must start with 09
  if (!digitsOnly.startsWith('09')) {
    return { isValid: false, error: 'Philippine phone number must start with 09' };
  }

  return { isValid: true };
};

/**
 * Full Name validation (no special characters, no numbers)
 */
export const validateFullName = (name: string): { isValid: boolean; error?: string } => {
  if (!name || name.trim() === '') {
    return { isValid: false, error: 'Full name is required' };
  }

  if (name.trim().length < 2) {
    return { isValid: false, error: 'Full name must be at least 2 characters long' };
  }

  if (name.trim().length > 100) {
    return { isValid: false, error: 'Full name must not exceed 100 characters' };
  }

  // Check for numbers
  if (/\d/.test(name)) {
    return { isValid: false, error: 'Full name should not contain numbers' };
  }

  // Check for special characters (allow only letters, spaces, hyphens, apostrophes, and dots)
  if (!/^[a-zA-Z\s\-'.]+$/.test(name)) {
    return { isValid: false, error: 'Full name should not contain special characters' };
  }

  return { isValid: true };
};

/**
 * Name validation (general, for other forms)
 */
export const validateName = (name: string, fieldName: string = 'Name'): { isValid: boolean; error?: string } => {
  if (!name || name.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (name.trim().length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters long` };
  }

  if (name.trim().length > 100) {
    return { isValid: false, error: `${fieldName} must not exceed 100 characters` };
  }

  return { isValid: true };
};

/**
 * Required field validation
 */
export const validateRequired = (value: string | number | null | undefined, fieldName: string): { isValid: boolean; error?: string } => {
  if (value === null || value === undefined || value === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (typeof value === 'string' && value.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }

  return { isValid: true };
};

/**
 * Number validation
 */
export const validateNumber = (value: string | number, fieldName: string, min?: number, max?: number): { isValid: boolean; error?: string } => {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }

  if (min !== undefined && num < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (max !== undefined && num > max) {
    return { isValid: false, error: `${fieldName} must not exceed ${max}` };
  }

  return { isValid: true };
};

/**
 * Price validation
 */
export const validatePrice = (price: string | number, fieldName: string = 'Price'): { isValid: boolean; error?: string } => {
  const result = validateNumber(price, fieldName, 0);
  
  if (!result.isValid) {
    return result;
  }

  const num = typeof price === 'string' ? parseFloat(price) : price;
  
  if (num === 0) {
    return { isValid: false, error: `${fieldName} must be greater than 0` };
  }

  return { isValid: true };
};

/**
 * URL validation
 */
export const validateURL = (url: string, required: boolean = false): { isValid: boolean; error?: string } => {
  if (!url || url.trim() === '') {
    if (required) {
      return { isValid: false, error: 'URL is required' };
    }
    return { isValid: true };
  }

  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Please enter a valid URL' };
  }
};

/**
 * Image file validation
 */
export const validateImageFile = (file: File | null, required: boolean = false): { isValid: boolean; error?: string } => {
  if (!file) {
    if (required) {
      return { isValid: false, error: 'Image is required' };
    }
    return { isValid: true };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Please upload a valid image file (JPEG, PNG, GIF, or WebP)' };
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { isValid: false, error: 'Image size must not exceed 5MB' };
  }

  return { isValid: true };
};

/**
 * Date validation
 */
export const validateDate = (date: string | Date, fieldName: string = 'Date', allowPast: boolean = false): { isValid: boolean; error?: string } => {
  if (!date) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: `Please enter a valid ${fieldName.toLowerCase()}` };
  }

  if (!allowPast) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateObj.setHours(0, 0, 0, 0);

    if (dateObj < today) {
      return { isValid: false, error: `${fieldName} cannot be in the past` };
    }
  }

  return { isValid: true };
};

/**
 * Time validation
 */
export const validateTime = (time: string, fieldName: string = 'Time'): { isValid: boolean; error?: string } => {
  if (!time || time.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }

  // Check time format (HH:MM AM/PM)
  const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
  if (!timeRegex.test(time)) {
    return { isValid: false, error: `Please enter a valid ${fieldName.toLowerCase()} (e.g., 10:00 AM)` };
  }

  return { isValid: true };
};

/**
 * Confirm password validation
 */
export const validateConfirmPassword = (password: string, confirmPassword: string): { isValid: boolean; error?: string } => {
  if (!confirmPassword || confirmPassword.trim() === '') {
    return { isValid: false, error: 'Please confirm your password' };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }

  return { isValid: true };
};

// ==================== COMPOSITE VALIDATORS ====================

/**
 * Validate login form
 */
export const validateLoginForm = (email: string, password: string): ValidationResult => {
  const errors: ValidationError[] = [];

  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    errors.push({ field: 'email', message: emailValidation.error! });
  }

  const passwordValidation = validateRequired(password, 'Password');
  if (!passwordValidation.isValid) {
    errors.push({ field: 'password', message: passwordValidation.error! });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate registration form
 */
export const validateRegistrationForm = (
  name: string,
  email: string,
  phone: string,
  password: string,
  confirmPassword: string
): ValidationResult => {
  const errors: ValidationError[] = [];

  const nameValidation = validateFullName(name);
  if (!nameValidation.isValid) {
    errors.push({ field: 'name', message: nameValidation.error! });
  }

  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    errors.push({ field: 'email', message: emailValidation.error! });
  }

  const phoneValidation = validatePhone(phone);
  if (!phoneValidation.isValid) {
    errors.push({ field: 'phone', message: phoneValidation.error! });
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    errors.push({ field: 'password', message: passwordValidation.error! });
  }

  const confirmPasswordValidation = validateConfirmPassword(password, confirmPassword);
  if (!confirmPasswordValidation.isValid) {
    errors.push({ field: 'confirmPassword', message: confirmPasswordValidation.error! });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate service form
 */
export const validateServiceForm = (
  name: string,
  description: string,
  price: string | number,
  duration: string | number
): ValidationResult => {
  const errors: ValidationError[] = [];

  const nameValidation = validateName(name, 'Service name');
  if (!nameValidation.isValid) {
    errors.push({ field: 'name', message: nameValidation.error! });
  }

  const descriptionValidation = validateRequired(description, 'Description');
  if (!descriptionValidation.isValid) {
    errors.push({ field: 'description', message: descriptionValidation.error! });
  }

  const priceValidation = validatePrice(price);
  if (!priceValidation.isValid) {
    errors.push({ field: 'price', message: priceValidation.error! });
  }

  const durationValidation = validateNumber(duration, 'Duration', 1);
  if (!durationValidation.isValid) {
    errors.push({ field: 'duration', message: durationValidation.error! });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate barber form
 */
export const validateBarberForm = (
  name: string,
  email: string,
  phone: string,
  specialty: string
): ValidationResult => {
  const errors: ValidationError[] = [];

  const nameValidation = validateName(name, 'Barber name');
  if (!nameValidation.isValid) {
    errors.push({ field: 'name', message: nameValidation.error! });
  }

  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    errors.push({ field: 'email', message: emailValidation.error! });
  }

  const phoneValidation = validatePhone(phone);
  if (!phoneValidation.isValid) {
    errors.push({ field: 'phone', message: phoneValidation.error! });
  }

  const specialtyValidation = validateRequired(specialty, 'Specialty');
  if (!specialtyValidation.isValid) {
    errors.push({ field: 'specialty', message: specialtyValidation.error! });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate customer form
 */
export const validateCustomerForm = (
  name: string,
  email: string,
  phone: string
): ValidationResult => {
  const errors: ValidationError[] = [];

  const nameValidation = validateName(name, 'Customer name');
  if (!nameValidation.isValid) {
    errors.push({ field: 'name', message: nameValidation.error! });
  }

  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    errors.push({ field: 'email', message: emailValidation.error! });
  }

  const phoneValidation = validatePhone(phone);
  if (!phoneValidation.isValid) {
    errors.push({ field: 'phone', message: phoneValidation.error! });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate booking form
 */
export const validateBookingForm = (
  serviceId: string,
  barberId: string,
  date: string,
  time: string
): ValidationResult => {
  const errors: ValidationError[] = [];

  const serviceValidation = validateRequired(serviceId, 'Service');
  if (!serviceValidation.isValid) {
    errors.push({ field: 'service', message: serviceValidation.error! });
  }

  const barberValidation = validateRequired(barberId, 'Barber');
  if (!barberValidation.isValid) {
    errors.push({ field: 'barber', message: barberValidation.error! });
  }

  const dateValidation = validateDate(date, 'Date', false);
  if (!dateValidation.isValid) {
    errors.push({ field: 'date', message: dateValidation.error! });
  }

  const timeValidation = validateTime(time);
  if (!timeValidation.isValid) {
    errors.push({ field: 'time', message: timeValidation.error! });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Get error message for a specific field
 */
export const getFieldError = (errors: ValidationError[], fieldName: string): string | undefined => {
  const error = errors.find(e => e.field === fieldName);
  return error?.message;
};

/**
 * Check if a field has an error
 */
export const hasFieldError = (errors: ValidationError[], fieldName: string): boolean => {
  return errors.some(e => e.field === fieldName);
};