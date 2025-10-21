'use client';

import { cn } from '@/lib/utils';
import { ThemeSwitcher } from '@/components/theme-switcher';

interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
  return (
    <nav className={cn(
      "relative w-full backdrop-blur-lg bg-gradient-to-r from-purple-600/40 to-purple-700/40 dark:from-purple-900/30 dark:to-purple-900/30 px-6 py-4 shadow-2xl rounded-bl-2xl rounded-br-2xl border border-white/20 dark:border-white/10",
      className
    )}>
      <div className="absolute inset-0 bg-white/10 dark:bg-slate-900/20 rounded-bl-2xl rounded-br-2xl -z-10"></div>

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent" style={{ fontFamily: 'Lexend, sans-serif' }}>
            Digital Lessons
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="backdrop-blur-sm bg-white/30 dark:bg-slate-900/40 rounded-full px-4 py-2 shadow-lg border border-white/20 dark:border-white/10">
            <span className="text-gray-900 dark:text-white font-semibold text-sm" style={{ fontFamily: 'Lexend, sans-serif' }}>
              Hello User
            </span>
          </div>
          <ThemeSwitcher />
        </div>
      </div>
    </nav>
  );
}
