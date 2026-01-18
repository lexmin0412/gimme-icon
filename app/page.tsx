"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient, signIn, signOut } from "@/libs/auth-client";
import { embeddingService } from "../services/embedding";
import { iconSearchService } from "../services/IconSearchService";
import { useToast } from "./components/ToastProvider";
import { LandingHero } from "./components/LandingHero";
import { Header } from "./components/Header";

// Create a component using SearchContext
const HomeContent: React.FC<{ isAppLoading: boolean }> = ({ isAppLoading }) => {
  const router = useRouter();
  const [user, setUser] = useState<{
    name?: string;
    image?: string | null;
  } | null>(null);
  const { showToast } = useToast();

  // Handle search query - navigate to search page
  const handleSearch = (query: string) => {
    if (isAppLoading) return;
    if (!query.trim()) {
      showToast("Please enter a keyword", "error");
      return;
    }
    
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  // Auth handlers
  const handleSignIn = async () => {
    await signIn();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      showToast("Signed out successfully", "success");
    } catch (error) {
      console.error("Sign out failed:", error);
      showToast("Failed to sign out", "error");
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await authClient.getSession();
        if (data?.user) {
          setUser(data.user);
          showToast("Signed in successfully", "success");
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Session check failed:", error);
      }
    };
    checkSession();
  }, []);

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden flex flex-col">
      <Header
        showSearchBar={false}
        onSearch={handleSearch}
        user={user}
        signIn={handleSignIn}
        signOut={handleSignOut}
        transparent={true}
      />

      <LandingHero onSearch={handleSearch} isAppLoading={isAppLoading} />
    </div>
  );
};

// Main Home component
const Home: React.FC = () => {
  const [isAppLoading, setIsAppLoading] = useState(true);

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await embeddingService.initialize();
        await iconSearchService.switchVectorStore({ type: "cloud-chroma" });
        await iconSearchService.initialize(false);
      } catch (error) {
        console.error("Failed to initialize app:", error);
      } finally {
        setIsAppLoading(false);
      }
    };

    initializeApp();
  }, []);

  return (
    <HomeContent isAppLoading={isAppLoading} />
  );
};

export default Home;
