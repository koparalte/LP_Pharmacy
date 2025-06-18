
"use client"; // Required for hooks like useAuth and useRouter

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
// import { useAuth } from '@/hooks/useAuth'; // Login disabled
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  // const { user, loading } = useAuth(); // Login disabled
  const router = useRouter();

  useEffect(() => {
    // if (!loading) { // Login disabled
    //   if (user) { // Login disabled
    //     router.replace('/dashboard');
    //   } else { // Login disabled
    //     router.replace('/login');
    //   }
    // }
    router.replace('/dashboard'); // Always redirect to dashboard since login is disabled
  }, [router]); // Removed loading and user from dependencies

  // Render a loading state while auth status is being determined
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="sr-only">Loading application...</p>
    </div>
  );
}
