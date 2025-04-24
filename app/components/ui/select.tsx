import React, { useState } from 'react';

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectValueProps {
  placeholder?: string;
  children?: React.ReactNode;
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === SelectTrigger) {
            return React.cloneElement(child, {
              onClick: () => setIsOpen(!isOpen),
              isOpen
            });
          }
          if (child.type === SelectContent && isOpen) {
            return React.cloneElement(child, {
              onSelect: (value: string) => {
                onValueChange(value);
                setIsOpen(false);
              }
            });
          }
        }
        return child;
      })}
    </div>
  );
}

export function SelectTrigger({ children, className = '' }: SelectTriggerProps) {
  return (
    <button
      className={`w-full px-3 py-2 text-left border rounded-md ${className}`}
    >
      {children}
    </button>
  );
}

export function SelectValue({ placeholder, children }: SelectValueProps) {
  return <span>{children || placeholder}</span>;
}

export function SelectContent({ children, className = '' }: SelectContentProps) {
  return (
    <div className={`absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg ${className}`}>
      {children}
    </div>
  );
}

export function SelectItem({ value, children, className = '' }: SelectItemProps) {
  return (
    <div
      className={`px-3 py-2 hover:bg-gray-100 cursor-pointer ${className}`}
    >
      {children}
    </div>
  );
} 