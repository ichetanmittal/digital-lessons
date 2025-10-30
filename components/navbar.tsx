'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth-utils';
import { toast } from 'sonner';

interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    const result = await signOut();
    if (result.success) {
      toast.success('Logged out successfully');
      router.push('/sign-in');
    } else {
      toast.error(result.error || 'Failed to log out');
    }
  }, [router]);

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
              {user?.email || 'User'}
            </span>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="bg-white/20 hover:bg-white/30 text-white border-white/30"
          >
            Logout
          </Button>
          <ThemeSwitcher />
        </div>
      </div>
    </nav>
  );
}
