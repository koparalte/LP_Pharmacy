
"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login?redirect=/settings"); // Redirect to login if not authenticated
      } else if (!isAdmin) {
        // If user is authenticated but not an admin, handle appropriately
        // For now, redirecting to dashboard. Could also show an access denied page.
        // router.replace("/dashboard"); 
      }
    }
  }, [user, isAdmin, loading, router]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-150px)] flex-col items-center justify-center bg-background p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  if (!user) {
    // This state should ideally be caught by the useEffect redirect.
    // However, as a fallback, show a message.
     return (
      <div className="flex h-[calc(100vh-150px)] flex-col items-center justify-center bg-background p-6 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Authentication Required</h2>
        <p className="text-muted-foreground mb-6">
          You need to be logged in to access this page.
        </p>
        <Button asChild>
          <Link href="/login?redirect=/settings">Go to Login</Link>
        </Button>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="flex h-[calc(100vh-150px)] flex-col items-center justify-center bg-background p-6 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-6">
          You do not have the necessary permissions to view this page.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
