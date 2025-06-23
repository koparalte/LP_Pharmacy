
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // This component acts as an entry point.
    // It will show a loader while auth state is resolved.
    // Once resolved, it redirects to the dashboard for both logged-in users and guests.
    // It redirects to login only if the user is explicitly not logged in and not loading.
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        // For guest access, we go to the dashboard.
        // If mandatory login is desired, this would be '/login'.
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router]);

  // Render a loading state while auth status is being determined
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="sr-only">Loading application...</p>
    </div>
  );
}
