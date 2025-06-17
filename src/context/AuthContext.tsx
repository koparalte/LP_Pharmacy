
"use client";

import type { User } from 'firebase/auth'; // Ensure User type is imported
import { createContext, useState, useEffect, type ReactNode } from 'react';
import { auth, db } from '@/lib/firebase'; // Firebase interaction re-enabled
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'; // Firebase interaction re-enabled
import { doc, getDoc } from "firebase/firestore"; // Firebase interaction re-enabled
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
  const [loading, setLoading] = useState(true); // Start as true
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true); 

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // setLoading(true); // This could cause a flicker if already true
        try {
          const adminDocRef = doc(db, "admins", currentUser.uid);
          const adminDocSnap = await getDoc(adminDocRef);
          if (adminDocSnap.exists()) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error("Error checking admin status in Firestore: ", error);
          setIsAdmin(false); // Default to not admin on error
           toast({
            title: "Admin Check Error",
            description: "Could not verify user admin status from Firestore.",
            variant: "destructive",
          });
        } finally {
          setLoading(false); // Done checking admin status
        }
      } else {
        setIsAdmin(false);
        setLoading(false); // No user, so loading is false
      }
    });
    return () => unsubscribe();
  }, [toast]);

  const loginWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      toast({
        title: "Login Successful",
        description: `Welcome back, ${result.user.displayName || 'User'}!`,
      });
      router.push('/dashboard');
      // setLoading(false) will be handled by onAuthStateChanged's final block
    } catch (error: any) {
      console.error("Error during Google sign-in: ", error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast({
          title: "Login Cancelled",
          description: "The sign-in process was cancelled.",
          variant: "default", 
        });
      } else {
        toast({
          title: "Login Failed",
          description: error.message || "Could not sign in with Google. Please try again.",
          variant: "destructive",
        });
      }
      setLoading(false); // Ensure loading is false on error
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      // User and isAdmin will be reset by onAuthStateChanged
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
    } finally {
      // setLoading(false); // onAuthStateChanged will handle final loading state once user is null
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
