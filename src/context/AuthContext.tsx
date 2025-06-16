
"use client";

import type { User } from 'firebase/auth';
import { createContext, useState, useEffect, type ReactNode } from 'react';
import { auth, db } from '@/lib/firebase'; // Import db
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from "firebase/firestore"; // Import doc and getDoc
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
        setLoading(true); // Set loading true while checking admin status
        try {
          // Check for admin status in Firestore
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
    // setLoading(true); // Loading will be handled by onAuthStateChanged
    setIsAdmin(false); // Reset admin status on new login attempt
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // Auth state change will be picked up by onAuthStateChanged to set user and check admin status
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
      setUser(null); 
      setIsAdmin(false);
      // setLoading(false); // Loading will be handled by onAuthStateChanged if it triggers
    }
  };

  const logout = async () => {
    // setLoading(true); // Loading will be handled by onAuthStateChanged
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
      // setLoading(false); // Loading will be handled by onAuthStateChanged if it triggers
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
