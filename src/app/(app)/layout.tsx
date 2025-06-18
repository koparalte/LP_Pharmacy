
"use client"; // Required for hooks like useAuth and useRouter

import { AppLayout } from "@/components/layout/AppLayout";
import type { ReactNode } from "react";
// import { useAuth } from "@/hooks/useAuth"; // Login disabled
// import { useRouter } from "next/navigation"; // Login disabled
// import { useEffect } from "react"; // Login disabled
// import { Loader2 } from "lucide-react"; // Login disabled

export default function AuthenticatedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  // const { user, loading } = useAuth(); // Login disabled
  // const router = useRouter(); // Login disabled

  // useEffect(() => { // Login disabled
  //   if (!loading && !user) {
  //     router.push("/login");
  //   }
  // }, [user, loading, router]);

  // if (loading) { // Login disabled
  //   return (
  //     <div className="flex h-screen items-center justify-center bg-background">
  //       <Loader2 className="h-12 w-12 animate-spin text-primary" />
  //     </div>
  //   );
  // }

  // if (!user) { // Login disabled
  //   return null; 
  // }

  return <AppLayout>{children}</AppLayout>;
}
