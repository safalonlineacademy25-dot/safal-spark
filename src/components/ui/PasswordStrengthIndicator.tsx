import { validatePassword, getStrengthLabel, getStrengthColor } from '@/lib/passwordValidation';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  if (!password) return null;

  const { score, errors } = validatePassword(password);
  const label = getStrengthLabel(score);
  const colorClass = getStrengthColor(score);

  const requirements = [
    { label: 'At least 12 characters', met: password.length >= 12 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Special character', met: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden flex gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`flex-1 rounded-full transition-colors ${
                i <= score ? colorClass : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-muted-foreground min-w-[70px] text-right">
          {label}
        </span>
      </div>

      {/* Requirements checklist */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        {requirements.map((req) => (
          <div key={req.label} className="flex items-center gap-1">
            {req.met ? (
              <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}
            <span className={`text-[11px] ${req.met ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
