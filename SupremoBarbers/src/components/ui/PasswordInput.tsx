/**
 * Password Input Component with Strength Indicator
 * Reusable password input with real-time validation and visual feedback
 */

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Input } from './input';
import { Label } from './label';
import { validatePassword, getPasswordFeedback, PasswordStrength } from '@/utils/passwordValidator';
import { Button } from './button';
import { cn } from './utils';

interface PasswordInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showStrength?: boolean;
  userName?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  onValidationChange?: (validation: PasswordStrength) => void;
}

export function PasswordInput({
  label = 'Password',
  value,
  onChange,
  placeholder = '••••••••',
  showStrength = true,
  userName,
  disabled = false,
  required = true,
  id,
  className,
  onValidationChange,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [validation, setValidation] = useState<PasswordStrength | null>(null);
  const [feedback, setFeedback] = useState({ color: 'bg-gray-300', text: '', progress: 0 });

  useEffect(() => {
    if (value && showStrength) {
      const result = validatePassword(value, userName);
      setValidation(result);
      setFeedback(getPasswordFeedback(value, userName));
      
      if (onValidationChange) {
        onValidationChange(result);
      }
    } else {
      setValidation(null);
      setFeedback({ color: 'bg-gray-300', text: '', progress: 0 });
      
      if (onValidationChange && value === '') {
        onValidationChange({
          strength: 'weak',
          score: 0,
          feedback: [],
          issues: [],
          isValid: false,
        });
      }
    }
  }, [value, userName, showStrength, onValidationChange]);

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id} className="text-[#5C4A3A]">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'pr-10 border-[#E8DCC8] focus:border-[#DB9D47] focus:ring-[#DB9D47]',
            validation && !validation.isValid && value.length >= 8 && 'border-red-300',
            validation && validation.isValid && 'border-green-300',
            className
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-[#87765E]" />
          ) : (
            <Eye className="h-4 w-4 text-[#87765E]" />
          )}
        </Button>
      </div>

      {/* Strength Indicator */}
      {showStrength && value && (
        <div className="space-y-2">
          {/* Strength Bar */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-600">
                Password Strength
              </span>
              <span className={cn(
                'text-xs font-semibold',
                validation?.strength === 'weak' && 'text-red-600',
                validation?.strength === 'medium' && 'text-yellow-600',
                validation?.strength === 'strong' && 'text-green-600'
              )}>
                {validation?.strength === 'strong' ? ' Strong' :
                 validation?.strength === 'medium' ? ' Medium' :
                 ' Weak'}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  validation?.strength === 'strong' && 'bg-green-500',
                  validation?.strength === 'medium' && 'bg-yellow-500',
                  validation?.strength === 'weak' && 'bg-red-500'
                )}
                style={{ width: `${validation?.score || 0}%` }}
              />
            </div>
          </div>

          {/* Issues Only - Critical feedback */}
          {validation && validation.issues.length > 0 && (
            <div className="space-y-1">
              {validation.issues.map((issue, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                  <span className="text-red-700">{issue}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Confirm Password Input Component
 * For password confirmation fields
 */
interface ConfirmPasswordInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  password: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
}

export function ConfirmPasswordInput({
  label = 'Confirm Password',
  value,
  onChange,
  password,
  placeholder = '••••••••',
  disabled = false,
  required = true,
  id,
  className,
}: ConfirmPasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const passwordsMatch = value === password;
  const showValidation = value.length > 0;

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id} className="text-[#5C4A3A]">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'pr-10 border-[#E8DCC8] focus:border-[#DB9D47] focus:ring-[#DB9D47]',
            showValidation && !passwordsMatch && 'border-red-300',
            showValidation && passwordsMatch && 'border-green-300',
            className
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-[#87765E]" />
          ) : (
            <Eye className="h-4 w-4 text-[#87765E]" />
          )}
        </Button>
      </div>

      {/* Match Indicator */}
      {showValidation && (
        <div className="flex items-start gap-2 text-xs">
          {passwordsMatch ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-green-700">Passwords match</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
              <span className="text-red-700">Passwords do not match</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}