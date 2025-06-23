
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
        router.replace("/login?redirect=/settings"); 
      } else if (!isAdmin) {
        // If user is logged in but not an admin, redirect them away.
        router.replace("/dashboard"); 
      }
    }
  }, [user, isAdmin, loading, router]);

  // While loading, show a spinner
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-150px)] flex-col items-center justify-center bg-background p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verifying access...</p>
      </div>
    );
  }
  
  // After loading, if user is not an admin (which also covers not logged in), show access denied.
  // The useEffect will handle the redirect, but this provides an immediate UI feedback.
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

  // If loading is false and user is admin, render the children
  return <>{children}</>;
}
