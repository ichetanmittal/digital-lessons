'use client';

import { cn } from '@/lib/utils';
import { ThemeSwitcher } from '@/components/theme-switcher';

interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
  return (
    <nav className={cn(
      "w-full bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 shadow-lg rounded-bl-2xl rounded-br-2xl",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Lexend, sans-serif' }}>
            Digital Lessons
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white rounded-lg px-4 py-2 shadow-md">
            <span className="text-gray-800 font-semibold" style={{ fontFamily: 'Lexend, sans-serif' }}>
              Hello User
            </span>
          </div>
          <ThemeSwitcher />
        </div>
      </div>
    </nav>
  );
}
