
"use client";

import type { User } from 'firebase/auth'; // Ensure User type is imported
import { createContext, useState, useEffect, type ReactNode } from 'react';
// import { auth, db } from '@/lib/firebase'; // Firebase interaction commented out for testing
// import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'; // Firebase interaction commented out for testing
// import { doc, getDoc } from "firebase/firestore"; // Firebase interaction commented out for testing
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
    // setLoading(true); // Default state is true

    // // --- ORIGINAL Firebase Auth Listener - COMMENTED OUT FOR TESTING ---
    // const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    //   setUser(currentUser);
    //   if (currentUser) {
    //     // setLoading(true); // Ensure loading is true while checking admin status
    //     try {
    //       const adminDocRef = doc(db, "admins", currentUser.uid);
    //       const adminDocSnap = await getDoc(adminDocRef);
    //       if (adminDocSnap.exists()) {
    //         setIsAdmin(true);
    //       } else {
    //         setIsAdmin(false);
    //       }
    //     } catch (error) {
    //       console.error("Error checking admin status in Firestore: ", error);
    //       setIsAdmin(false); // Default to not admin on error
    //        toast({
    //         title: "Admin Check Error",
    //         description: "Could not verify user admin status from Firestore.",
    //         variant: "destructive",
    //       });
    //     } finally {
    //       setLoading(false); // Done checking admin status
    //     }
    //   } else {
    //     setIsAdmin(false);
    //     setLoading(false); // No user, so loading is false
    //   }
    // });
    // return () => unsubscribe();
    // // --- END ORIGINAL Firebase Auth Listener ---


    // --- TEMPORARY: Login disabled for testing ---
    console.log("AuthProvider: Simulating logged-in admin user for testing purposes.");
    const mockUser: User = {
      uid: 'mock-admin-uid-12345',
      email: 'admin-test@example.com',
      displayName: 'Mock Test Admin',
      photoURL: null, // Or a placeholder image URL string e.g., "https://placehold.co/100x100.png"
      emailVerified: true,
      isAnonymous: false,
      metadata: {
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString(),
      },
      providerData: [{
        providerId: 'google.com', // Example providerId
        uid: 'mock-provider-uid',
        displayName: 'Mock Test Admin',
        email: 'admin-test@example.com',
        photoURL: null, // Or a placeholder image URL string
        phoneNumber: null,
      }],
      refreshToken: 'mock-refresh-token-for-testing',
      tenantId: null,
      delete: async () => { console.log('Mock user delete() called'); },
      getIdToken: async (forceRefresh?: boolean) => { console.log('Mock user getIdToken() called', {forceRefresh}); return 'mock-id-token-for-testing'; },
      getIdTokenResult: async (forceRefresh?: boolean) => {
        console.log('Mock user getIdTokenResult() called', {forceRefresh});
        return {
          token: 'mock-id-token-for-testing',
          authTime: new Date().toISOString(),
          issuedAtTime: new Date().toISOString(),
          signInProvider: 'password', // Can be 'password', 'google.com', etc.
          signInSecondFactor: null,
          expirationTime: new Date(Date.now() + 3600 * 1000).toISOString(), // Expires in 1 hour
          claims: { /* admin: true */ }, // No need for admin claim if isAdmin is set directly
        };
      },
      reload: async () => { console.log('Mock user reload() called'); },
      toJSON: () => ({ // A simplified JSON representation
        uid: 'mock-admin-uid-12345',
        email: 'admin-test@example.com',
        displayName: 'Mock Test Admin',
        photoURL: null,
        emailVerified: true,
      }),
    };

    setUser(mockUser);
    setIsAdmin(true); // Simulate admin user for comprehensive testing
    setLoading(false); // Authentication check is "done"
    // --- END TEMPORARY ---

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Toast and router removed from deps as they aren't used in the mock path

  const loginWithGoogle = async () => {
    console.log("AuthContext: loginWithGoogle called (currently mocked).");
    // Simulate login for testing consistency if login page is somehow accessed
    const mockUserLogin: User = { // Re-using structure for consistency
        uid: 'mock-admin-uid-12345',
        email: 'admin-test@example.com',
        displayName: 'Mock Test Admin',
        photoURL: null,
        emailVerified: true,
        isAnonymous: false,
        metadata: { creationTime: new Date().toISOString(), lastSignInTime: new Date().toISOString() },
        providerData: [{ providerId: 'google.com', uid: 'mock-provider-uid', displayName: 'Mock Test Admin', email: 'admin-test@example.com', photoURL: null, phoneNumber: null }],
        refreshToken: 'mock-refresh-token-for-testing',
        tenantId: null,
        delete: async () => { console.log('Mock user delete() called'); },
        getIdToken: async () => 'mock-id-token-for-testing',
        getIdTokenResult: async () => ({ token: 'mock-id-token-for-testing', authTime: new Date().toISOString(), issuedAtTime: new Date().toISOString(), signInProvider: 'password', signInSecondFactor: null, expirationTime: new Date(Date.now() + 3600 * 1000).toISOString(), claims: {}}),
        reload: async () => { console.log('Mock user reload() called'); },
        toJSON: () => ({ uid: 'mock-admin-uid-12345', email: 'admin-test@example.com', displayName: 'Mock Test Admin', photoURL: null, emailVerified: true }),
    };
    setUser(mockUserLogin);
    setIsAdmin(true);
    setLoading(false);
    router.push('/dashboard');
    toast({
      title: "Mock Login Successful",
      description: `Testing Mode: Logged in as ${mockUserLogin.displayName || 'User'}.`,
    });
  };

  const logout = async () => {
    console.log("AuthContext: logout called (currently mocked).");
    setUser(null);
    setIsAdmin(false);
    setLoading(false); // Set loading to false as "logout" is complete
    router.push('/login'); // Still good to simulate the redirect
    toast({
      title: "Mock Logged Out",
      description: "Testing Mode: You have been successfully logged out.",
    });
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
