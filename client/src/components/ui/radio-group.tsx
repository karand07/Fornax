import * as React from 'react';
import { cn } from '@/lib/utils';

interface RadioGroupContextValue {
  value?: string | number;
  onChange?: (value: any) => void;
  name?: string;
  disabled?: boolean;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue>({});

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string | number;
  onValueChange?: (value: any) => void;
  name?: string;
  disabled?: boolean;
}

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, name, disabled, children, ...props }, ref) => {
    return (
      <RadioGroupContext.Provider
        value={{ value, onChange: onValueChange, name, disabled }}
      >
        <div
          ref={ref}
          role="radiogroup"
          className={cn('grid gap-2', className)}
          {...props}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  }
);
RadioGroup.displayName = 'RadioGroup';

export interface RadioGroupItemProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string | number;
}

export const RadioGroupItem = React.forwardRef<
  HTMLInputElement,
  RadioGroupItemProps
>(({ className, value, disabled: itemDisabled, id, ...props }, ref) => {
  const context = React.useContext(RadioGroupContext);
  const isChecked = context.value !== undefined && context.value !== null && String(context.value) === String(value);
  const isDisabled = itemDisabled || context.disabled;

  return (
    <div className="relative inline-flex items-center">
      <input
        ref={ref}
        type="radio"
        id={id}
        name={context.name}
        value={value}
        checked={isChecked}
        disabled={isDisabled}
        onChange={() => context.onChange?.(value)}
        className={cn(
          'peer h-4 w-4 rounded-full border border-slate-700 bg-slate-900 text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer accent-indigo-600',
          className
        )}
        {...props}
      />
    </div>
  );
});
RadioGroupItem.displayName = 'RadioGroupItem';
