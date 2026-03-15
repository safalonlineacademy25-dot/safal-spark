// Common weak passwords to block
const COMMON_PASSWORDS = [
  'password', 'password1', 'password123', '123456', '12345678', '123456789',
  'qwerty', 'abc123', 'letmein', 'admin', 'welcome', 'monkey', 'master',
  'dragon', 'login', 'princess', 'football', 'shadow', 'sunshine', 'trustno1',
  'iloveyou', 'batman', 'access', 'hello', 'charlie', 'donald', '1234567',
  '1234567890', 'passw0rd', 'p@ssword', 'p@ssw0rd', 'admin123', 'root',
];

export interface PasswordStrength {
  isValid: boolean;
  score: number; // 0-5
  errors: string[];
}

export function validatePassword(password: string): PasswordStrength {
  const errors: string[] = [];
  let score = 0;

  if (password.length >= 12) {
    score++;
  } else {
    errors.push('At least 12 characters');
  }

  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    errors.push('At least one uppercase letter');
  }

  if (/[a-z]/.test(password)) {
    score++;
  } else {
    errors.push('At least one lowercase letter');
  }

  if (/[0-9]/.test(password)) {
    score++;
  } else {
    errors.push('At least one number');
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score++;
  } else {
    errors.push('At least one special character (!@#$%^&*)');
  }

  // Check common passwords
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('This password is too common');
    score = 0;
  }

  return {
    isValid: errors.length === 0,
    score,
    errors,
  };
}

export function getStrengthLabel(score: number): string {
  if (score <= 1) return 'Very Weak';
  if (score === 2) return 'Weak';
  if (score === 3) return 'Fair';
  if (score === 4) return 'Strong';
  return 'Very Strong';
}

export function getStrengthColor(score: number): string {
  if (score <= 1) return 'bg-destructive';
  if (score === 2) return 'bg-orange-500';
  if (score === 3) return 'bg-yellow-500';
  if (score === 4) return 'bg-emerald-400';
  return 'bg-emerald-600';
}
