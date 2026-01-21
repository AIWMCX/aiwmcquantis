import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PasswordStrength {
  score: number;
  percentage: number;
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: 'destructive' | 'warning' | 'accent' | 'success';
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;
  const percentage = (score / 5) * 100;

  let label: PasswordStrength['label'];
  let color: PasswordStrength['color'];

  if (score <= 2) {
    label = 'Weak';
    color = 'destructive';
  } else if (score === 3) {
    label = 'Fair';
    color = 'warning';
  } else if (score === 4) {
    label = 'Good';
    color = 'accent';
  } else {
    label = 'Strong';
    color = 'success';
  }

  return { score, percentage, label, color, checks };
}

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const strength = checkPasswordStrength(password);

  const colorClasses = {
    destructive: {
      text: 'text-destructive',
      bg: 'bg-destructive',
    },
    warning: {
      text: 'text-orange-500',
      bg: 'bg-orange-500',
    },
    accent: {
      text: 'text-yellow-500',
      bg: 'bg-yellow-500',
    },
    success: {
      text: 'text-green-500',
      bg: 'bg-green-500',
    },
  };

  const classes = colorClasses[strength.color];

  return (
    <div className={cn('space-y-3 mt-2', className)}>
      {/* Strength Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Password Strength</span>
          <span className={cn('text-xs font-medium', classes.text)}>
            {strength.label}
          </span>
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-300', classes.bg)}
            style={{ width: `${strength.percentage}%` }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <RequirementItem met={strength.checks.length} text="12+ characters" />
        <RequirementItem met={strength.checks.uppercase} text="Uppercase (A-Z)" />
        <RequirementItem met={strength.checks.lowercase} text="Lowercase (a-z)" />
        <RequirementItem met={strength.checks.number} text="Number (0-9)" />
        <RequirementItem met={strength.checks.special} text="Special (!@#$%)" />
      </div>
    </div>
  );
}

interface RequirementItemProps {
  met: boolean;
  text: string;
}

function RequirementItem({ met, text }: RequirementItemProps) {
  return (
    <div className="flex items-center gap-1.5">
      {met ? (
        <Check className="w-3 h-3 text-green-500 shrink-0" />
      ) : (
        <X className="w-3 h-3 text-muted-foreground shrink-0" />
      )}
      <span className={cn(
        'transition-colors',
        met ? 'text-foreground' : 'text-muted-foreground'
      )}>
        {text}
      </span>
    </div>
  );
}
