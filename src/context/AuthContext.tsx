
"use client";

import type { User } from 'firebase/auth';
import { createContext, useState, useEffect, type ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const idTokenResult = await currentUser.getIdTokenResult();
          setIsAdmin(idTokenResult.claims.admin === true);
        } catch (error) {
          console.error("Error getting user claims: ", error);
          setIsAdmin(false);
           toast({
            title: "Claim Check Error",
            description: "Could not verify user admin status.",
            variant: "destructive",
          });
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [toast]);

  const loginWithGoogle = async () => {
    setLoading(true);
    setIsAdmin(false); // Reset admin status on new login attempt
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // Auth state change will be picked up by onAuthStateChanged to set user and claims
      // router.push('/dashboard'); // This will be handled by onAuthStateChanged effect or RootPage logic
       toast({
        title: "Login Successful",
        description: `Welcome, ${result.user.displayName || 'User'}!`,
      });
    } catch (error: any) {
      console.error("Error during Google sign-in: ", error);
      toast({
        title: "Login Failed",
        description: error.message || "An unexpected error occurred during sign-in.",
        variant: "destructive",
      });
      setUser(null); // Explicitly set user to null on failed login
      setLoading(false); // Ensure loading is false on error
    }
    // setLoading(false) will be called by onAuthStateChanged
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      // setUser(null) and setIsAdmin(false) will be handled by onAuthStateChanged
      router.push('/login'); 
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (error: any) {
      console.error("Error during sign-out: ", error);
      toast({
        title: "Logout Failed",
        description: error.message || "Could not log out. Please try again.",
        variant: "destructive",
      });
      setLoading(false); // Ensure loading is false on error
    }
     // setLoading(false) will be called by onAuthStateChanged
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
