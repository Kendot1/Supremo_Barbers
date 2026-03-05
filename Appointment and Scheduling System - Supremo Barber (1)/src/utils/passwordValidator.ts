/**
 * Advanced Password Validator
 * Detects leet speak, dictionary words, common passwords, and provides strength analysis
 */

// Common leet speak character mappings
const leetSpeakMap: Record<string, string[]> = {
  'a': ['a', '4', '@', 'α'],
  'b': ['b', '8', 'ß'],
  'e': ['e', '3', '€'],
  'g': ['g', '9', '6'],
  'i': ['i', '1', '!', 'l', '|'],
  'l': ['l', '1', '!', 'i', '|'],
  'o': ['o', '0'],
  's': ['s', '5', '$'],
  't': ['t', '7', '+'],
  'z': ['z', '2'],
};

// Common dictionary words to check against
const commonWords = [
  'password', 'admin', 'user', 'login', 'welcome', 'hello', 'qwerty',
  'abc', 'letmein', 'monkey', 'dragon', 'master', 'sunshine', 'princess',
  'football', 'shadow', 'michael', 'jennifer', 'computer', 'wizard',
  'love', 'test', 'secret', 'access', 'account', 'supreme', 'barber',
  'anabelle', 'christian', 'maria', 'jose', 'john', 'jane', 'robert',
  'david', 'james', 'mary', 'patricia', 'linda', 'barbara', 'elizabeth',
  'jennifer', 'anna', 'emily', 'madison', 'sophia', 'olivia', 'emma',
  'ava', 'isabella', 'mia', 'abigail', 'william', 'alexander', 'daniel',
  'matthew', 'joseph', 'charles', 'thomas', 'christopher', 'andrew',
  'birthday', 'family', 'friends', 'forever', 'iloveyou', 'trustno',
  'superman', 'batman', 'spiderman', 'pokemon', 'naruto', 'sasuke',
  'kendot', 'kendon', 'kenneth', 'kenny', 'kevin', 'karen', 'kate',
  'january', 'february', 'march', 'april', 'june', 'july', 'august',
  'september', 'october', 'november', 'december', 'monday', 'tuesday',
  'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

// Common password patterns
const commonPasswords = [
  '123456', '12345678', '123456789', '1234567890',
  'password', 'password123', 'qwerty', 'qwerty123',
  'abc123', '111111', '1234', '12345', 
  'admin', 'admin123', 'root', 'toor',
  'pass', 'pass123', 'Password1', 'Password123'
];

/**
 * Convert a word to all possible leet speak variations
 */
function generateLeetVariations(word: string): Set<string> {
  const variations = new Set<string>();
  const chars = word.toLowerCase().split('');
  
  function generate(index: number, current: string) {
    if (index === chars.length) {
      variations.add(current);
      return;
    }
    
    const char = chars[index];
    const replacements = leetSpeakMap[char] || [char];
    
    for (const replacement of replacements) {
      generate(index + 1, current + replacement);
    }
  }
  
  generate(0, '');
  return variations;
}

/**
 * Normalize password by converting leet speak to regular characters
 */
function normalizeLeetSpeak(password: string): string {
  let normalized = password.toLowerCase();
  
  // Replace leet speak characters with their alphabetic equivalents
  normalized = normalized
    .replace(/[4@α]/g, 'a')
    .replace(/[8ß]/g, 'b')
    .replace(/[3€]/g, 'e')
    .replace(/[9]/g, 'g')
    .replace(/[1!|]/g, 'i')
    .replace(/0/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/[7+]/g, 't')
    .replace(/2/g, 'z');
  
  return normalized;
}

/**
 * Check if password contains a name (with leet speak detection)
 */
function containsName(password: string, name: string): boolean {
  if (!name || name.trim().length < 2) return false;
  
  const nameParts = name.toLowerCase().split(/\s+/);
  const normalizedPassword = normalizeLeetSpeak(password);
  
  // Check each part of the name
  for (const part of nameParts) {
    if (part.length < 2) continue;
    
    // Direct check in normalized password
    if (normalizedPassword.includes(part.toLowerCase())) {
      return true;
    }
    
    // Check reversed name
    if (normalizedPassword.includes(part.toLowerCase().split('').reverse().join(''))) {
      return true;
    }
    
    // Generate leet variations and check against original password
    const leetVariations = generateLeetVariations(part);
    for (const variation of leetVariations) {
      if (password.toLowerCase().includes(variation)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if password contains dictionary words (with leet speak detection)
 */
function containsDictionaryWord(password: string): { found: boolean; word?: string } {
  const normalizedPassword = normalizeLeetSpeak(password);
  
  for (const word of commonWords) {
    if (word.length < 3) continue;
    
    // Check in normalized password
    if (normalizedPassword.includes(word.toLowerCase())) {
      return { found: true, word };
    }
    
    // Check leet variations in original password
    const leetVariations = generateLeetVariations(word);
    for (const variation of leetVariations) {
      if (password.toLowerCase().includes(variation)) {
        return { found: true, word };
      }
    }
  }
  
  return { found: false };
}

/**
 * Check if password is a common/weak password
 */
function isCommonPassword(password: string): boolean {
  const lowerPassword = password.toLowerCase();
  
  for (const common of commonPasswords) {
    if (lowerPassword === common.toLowerCase()) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check password complexity
 */
function checkComplexity(password: string): {
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
} {
  return {
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
  };
}

/**
 * Check for sequential characters (123, abc, etc.)
 */
function hasSequentialChars(password: string): boolean {
  const sequences = [
    '0123456789',
    'abcdefghijklmnopqrstuvwxyz',
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm'
  ];
  
  const lowerPassword = password.toLowerCase();
  
  for (const sequence of sequences) {
    for (let i = 0; i <= sequence.length - 3; i++) {
      const chunk = sequence.substring(i, i + 3);
      if (lowerPassword.includes(chunk)) {
        return true;
      }
      // Check reverse
      if (lowerPassword.includes(chunk.split('').reverse().join(''))) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check for repeated characters (aaa, 111, etc.)
 */
function hasRepeatedChars(password: string): boolean {
  return /(.)\1{2,}/.test(password);
}

/**
 * Extract alphabetic segments from password (removing numbers and special chars)
 * Used to detect words that are padded with symbols/numbers like @Kendot09 or P@ssw0rd123
 */
function extractAlphabeticSegments(password: string): string[] {
  // Remove all non-alphabetic characters and split into segments
  const segments: string[] = [];
  let currentSegment = '';
  
  for (const char of password) {
    if (/[a-zA-Z]/.test(char)) {
      currentSegment += char;
    } else {
      if (currentSegment.length >= 3) {
        segments.push(currentSegment.toLowerCase());
      }
      currentSegment = '';
    }
  }
  
  // Don't forget the last segment
  if (currentSegment.length >= 3) {
    segments.push(currentSegment.toLowerCase());
  }
  
  return segments;
}

/**
 * Check if any alphabetic segment is a dictionary word or name
 * This catches passwords like @Kendot09, P@ssw0rd123, !Hello2023
 */
function containsWordSegment(password: string, userName?: string): { found: boolean; segment?: string; type?: string } {
  const segments = extractAlphabeticSegments(password);
  
  // Check each segment against dictionary words
  for (const segment of segments) {
    if (segment.length < 3) continue;
    
    // Normalize for leet speak
    const normalized = normalizeLeetSpeak(segment);
    
    // Check against common words
    for (const word of commonWords) {
      if (word.length < 3) continue;
      
      if (normalized === word.toLowerCase() || normalized.includes(word.toLowerCase())) {
        return { found: true, segment, type: 'dictionary word' };
      }
      
      // Check if segment contains the word
      if (segment.length >= word.length && segment.includes(word.toLowerCase())) {
        return { found: true, segment, type: 'dictionary word' };
      }
    }
    
    // Check against user name if provided
    if (userName) {
      const nameParts = userName.toLowerCase().split(/\s+/);
      for (const namePart of nameParts) {
        if (namePart.length < 2) continue;
        
        if (normalized === namePart || normalized.includes(namePart)) {
          return { found: true, segment, type: 'your name' };
        }
        
        if (segment === namePart || segment.includes(namePart)) {
          return { found: true, segment, type: 'your name' };
        }
      }
    }
  }
  
  return { found: false };
}

/**
 * Check for keyboard patterns (extended list)
 */
function hasKeyboardPattern(password: string): boolean {
  const patterns = [
    // Horizontal rows
    'qwerty', 'asdfgh', 'zxcvbn',
    'wertyui', 'sdfghjk', 'xcvbnm',
    'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
    // Vertical patterns
    'qaz', 'wsx', 'edc', 'rfv', 'tgb', 'yhn', 'ujm', 'ik', 'ol',
    // Diagonal patterns
    'qwe', 'asd', 'zxc', 'wer', 'sdf', 'xcv',
    // Number row
    '1234', '2345', '3456', '4567', '5678', '6789', '7890',
    '123456', '234567', '345678', '456789', '567890',
    // Common patterns
    'abcd', 'bcde', 'cdef', 'defg', 'efgh', 'fghi', 'ghij'
  ];
  
  const lowerPassword = password.toLowerCase();
  
  for (const pattern of patterns) {
    if (lowerPassword.includes(pattern)) {
      return true;
    }
    // Check reverse
    if (lowerPassword.includes(pattern.split('').reverse().join(''))) {
      return true;
    }
  }
  
  return false;
}

export interface PasswordStrength {
  strength: 'weak' | 'medium' | 'strong';
  score: number; // 0-100
  feedback: string[];
  issues: string[];
  isValid: boolean;
}

/**
 * Comprehensive password validation
 */
export function validatePassword(
  password: string,
  userName?: string
): PasswordStrength {
  const feedback: string[] = [];
  const issues: string[] = [];
  let score = 0;
  
  // Length validation
  if (password.length === 0) {
    return {
      strength: 'weak',
      score: 0,
      feedback: ['Password is required'],
      issues: ['Password cannot be empty'],
      isValid: false,
    };
  }
  
  if (password.length > 64) {
    return {
      strength: 'weak',
      score: 0,
      feedback: ['Password is too long'],
      issues: ['Password must not exceed 64 characters'],
      isValid: false,
    };
  }
  
  if (password.length < 8) {
    issues.push('Password must be at least 8 characters long');
    return {
      strength: 'weak',
      score: Math.min(password.length * 5, 35),
      feedback: ['Too short - use at least 8 characters'],
      issues,
      isValid: false,
    };
  }
  
  // Base score from length
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 15;
  if (password.length >= 16) score += 10;
  
  // Check for common passwords
  if (isCommonPassword(password)) {
    issues.push('This is a commonly used password');
    return {
      strength: 'weak',
      score: 10,
      feedback: ['This password is too common and easily guessed'],
      issues,
      isValid: false,
    };
  }
  
  // Check for name in password
  if (userName && containsName(password, userName)) {
    issues.push('Password contains your name (even with special characters)');
    return {
      strength: 'weak',
      score: Math.min(score, 25),
      feedback: ['Avoid using your name in the password, even with numbers or symbols'],
      issues,
      isValid: false,
    };
  }
  
  // Check for dictionary words
  const dictCheck = containsDictionaryWord(password);
  if (dictCheck.found) {
    
    return {
      strength: 'weak',
      score: Math.min(score, 30),
      feedback: ['Avoid using dictionary words, even with special characters or numbers'],
      issues,
      isValid: false,
    };
  }
  
  // Check for word segments
  const wordSegmentCheck = containsWordSegment(password, userName);
  if (wordSegmentCheck.found) {
    issues.push(`Password contains ${wordSegmentCheck.type}: "${wordSegmentCheck.segment}"`);
    return {
      strength: 'weak',
      score: Math.min(score, 30),
      feedback: ['Avoid using dictionary words or your name, even with special characters or numbers'],
      issues,
      isValid: false,
    };
  }
  
  // Check complexity
  const complexity = checkComplexity(password);
  if (complexity.hasUpperCase) score += 10;
  if (complexity.hasLowerCase) score += 10;
  if (complexity.hasNumber) score += 10;
  if (complexity.hasSpecialChar) score += 15;
  
  // Check for sequential characters
  if (hasSequentialChars(password)) {
    score -= 15;
    issues.push('Contains sequential characters (123, abc, etc.)');
  }
  
  // Check for repeated characters
  if (hasRepeatedChars(password)) {
    score -= 10;
    issues.push('Contains repeated characters (aaa, 111, etc.)');
  }
  
  // Check for keyboard patterns
  if (hasKeyboardPattern(password)) {
    score -= 10;
    issues.push('Contains keyboard patterns (qwerty, asdfg, etc.)');
  }
  
  // Ensure minimum complexity for passwords >= 8 characters
  const complexityCount = [
    complexity.hasUpperCase,
    complexity.hasLowerCase,
    complexity.hasNumber,
    complexity.hasSpecialChar,
  ].filter(Boolean).length;
  
  if (complexityCount < 3) {
    issues.push('Use a mix of uppercase, lowercase, numbers, and symbols');
  }
  
  // Determine strength based on length and score
  let strength: 'weak' | 'medium' | 'strong';
  
  if (password.length < 8) {
    strength = 'weak';
  } else if (password.length >= 12 && score >= 70 && complexityCount >= 3) {
    strength = 'strong';
    feedback.push('Strong password! ');
  } else if (password.length >= 9 && password.length <= 11) {
    // 9-11 characters: evaluate based on score and complexity
    if (score >= 60 && complexityCount >= 3 && issues.length === 0) {
      strength = 'strong';
      feedback.push('Strong password! ');
    } else {
      strength = 'weak';
      if (complexityCount < 3) {
        feedback.push('Add more character variety for a stronger password');
      }
      if (issues.length > 0) {
        feedback.push('Address the issues to improve password strength');
      }
    }
  } else if (password.length >= 12) {
    // 12+ characters but failed checks
    strength = 'weak';
    feedback.push('Length is good, but address the issues listed below');
  } else {
    strength = 'weak';
    feedback.push('Use at least 12 characters with variety for a strong password');
  }
  
  // Add positive feedback for strong passwords
  if (strength === 'strong' && feedback.length === 1) {
    if (password.length >= 16) {
      feedback.push('Excellent length and complexity');
    } else if (complexityCount === 4) {
      feedback.push('Great mix of character types');
    }
  }
  
  // Clamp score
  score = Math.max(0, Math.min(100, score));
  
  return {
    strength,
    score,
    feedback,
    issues,
    isValid: strength === 'strong' || (strength === 'medium' && issues.length === 0),
  };
}

/**
 * Get real-time password feedback for UI display
 */
export function getPasswordFeedback(password: string, userName?: string): {
  color: string;
  text: string;
  progress: number;
} {
  const validation = validatePassword(password, userName);
  
  if (password.length === 0) {
    return {
      color: 'bg-gray-300',
      text: '',
      progress: 0,
    };
  }
  
  if (validation.strength === 'weak') {
    return {
      color: 'bg-red-500',
      text: 'Weak',
      progress: Math.min(validation.score, 40),
    };
  } else if (validation.strength === 'medium') {
    return {
      color: 'bg-yellow-500',
      text: 'Medium',
      progress: Math.min(validation.score, 70),
    };
  } else {
    return {
      color: 'bg-green-500',
      text: 'Strong',
      progress: validation.score,
    };
  }
}