"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  loginWithGithub: () => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check localStorage for existing session
        const storedUser = localStorage.getItem("vibewave_user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, accept any email/password
      if (email && password) {
        const userData: User = {
          id: "1",
          name: email.split("@")[0],
          email: email,
        };
        
        setUser(userData);
        localStorage.setItem("vibewave_user", JSON.stringify(userData));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, accept any valid form data
      if (name && email && password) {
        const userData: User = {
          id: "1",
          name: name,
          email: email,
        };
        
        setUser(userData);
        localStorage.setItem("vibewave_user", JSON.stringify(userData));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Registration failed:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Simulate Google OAuth flow
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock Google user data
      const userData: User = {
        id: "google_123",
        name: "Google User",
        email: "user@gmail.com",
        avatar: "https://via.placeholder.com/40",
      };
      
      setUser(userData);
      localStorage.setItem("vibewave_user", JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error("Google login failed:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGithub = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Simulate GitHub OAuth flow
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock GitHub user data
      const userData: User = {
        id: "github_456",
        name: "GitHub User",
        email: "user@github.com",
        avatar: "https://via.placeholder.com/40",
      };
      
      setUser(userData);
      localStorage.setItem("vibewave_user", JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error("GitHub login failed:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("vibewave_user");
    router.push("/");
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    loginWithGoogle,
    loginWithGithub,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

