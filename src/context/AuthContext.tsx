
"use client";

import type { User } from 'firebase/auth';
import { createContext, useState, useEffect, type ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from "firebase/firestore";
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
  const [loading, setLoading] = useState(true); // Initial state is true
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // setLoading(true) is redundant here as initial state is true.
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const adminDocRef = doc(db, "admins", currentUser.uid);
          const adminDocSnap = await getDoc(adminDocRef);
          setIsAdmin(adminDocSnap.exists());
        } catch (error) {
          console.error("Error checking admin status in Firestore: ", error);
          setIsAdmin(false);
          toast({
            title: "Admin Check Error",
            description: "Could not verify user admin status from Firestore.",
            variant: "destructive",
          });
        } finally {
          setLoading(false); // Set loading to false after admin check
        }
      } else {
        setIsAdmin(false);
        setLoading(false); // No user, set loading to false
      }
    });
    return () => unsubscribe();
  }, [toast]);

  const loginWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // User state, admin status, and final loading state will be handled by onAuthStateChanged.
      toast({
        title: "Login Successful",
        description: `Welcome back, ${result.user.displayName || 'User'}!`,
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Error during Google sign-in: ", error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast({
          title: "Login Cancelled",
          description: "The sign-in process was cancelled by the user.",
          variant: "default", 
        });
      } else {
        toast({
          title: "Login Failed",
          description: error.message || "Could not sign in with Google. Please try again.",
          variant: "destructive",
        });
      }
      setLoading(false); // Ensure loading is reset on any error during login attempt itself
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      // User, isAdmin, and final loading state will be reset by onAuthStateChanged.
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
      setLoading(false); // Ensure loading is reset if signOut itself fails
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
