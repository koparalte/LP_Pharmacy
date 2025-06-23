
"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthenticatedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
