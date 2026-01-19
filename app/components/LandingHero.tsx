"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Cabin_Sketch } from "next/font/google";
import SearchBar from "./SearchBar";
import { cn } from "@/libs/utils";
import { useTranslations } from "next-intl";

const cabinSketch = Cabin_Sketch({ 
  subsets: ["latin"],
  weight: ["400", "700"],
});

interface LandingHeroProps {
  onSearch: (query: string) => void;
  isAppLoading: boolean;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onSearch,
  isAppLoading,
}) => {
  const t = useTranslations('Landing');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-background">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: '4rem 4rem',
            transform: `translate(${mousePosition.x * -20}px, ${mousePosition.y * -20}px)`
          }}
        />
      </div>

      {/* Gradient Blobs */}
      <motion.div 
        className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none"
        animate={{
          x: mousePosition.x * 50,
          y: mousePosition.y * 50,
        }}
        transition={{ type: "spring", damping: 50, stiffness: 50 }}
      />
      <motion.div 
        className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[120px] pointer-events-none"
        animate={{
          x: mousePosition.x * -50,
          y: mousePosition.y * -50,
        }}
        transition={{ type: "spring", damping: 50, stiffness: 50 }}
      />

      <div className="relative z-10 w-full max-w-5xl px-6 flex flex-col items-center">
        {/* Main Title */}
        <div className="mb-12 relative">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "text-7xl md:text-9xl font-bold tracking-tighter text-center leading-[0.9] text-foreground select-none relative z-20",
              cabinSketch.className
            )}
          >
            <span className="block">GIMME</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-br from-foreground to-foreground/50">
              ICON!
            </span>
          </motion.h1>
          
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 12 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 20 }}
            className="absolute -top-6 -right-8 md:-right-16 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full border-2 border-background shadow-xl hidden sm:block z-30"
          >
            v0.2.0
          </motion.div>
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-lg md:text-2xl text-muted-foreground text-center max-w-xl mb-12 font-medium tracking-tight leading-relaxed"
        >
          {t('subtitle')}
        </motion.p>

        {/* Search Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="w-full max-w-2xl"
        >
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-background/80 backdrop-blur-xl rounded-xl border shadow-2xl p-2">
              <SearchBar
                onSearch={onSearch}
                placeholder={isAppLoading ? t("initializing") : t("searchPlaceholder")}
                disabled={isAppLoading}
                showButton={true}
                className="w-full"
                inputClassName="bg-transparent shadow-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-lg pl-12 pr-4 h-14 placeholder:text-muted-foreground/50"
                multiline={false}
              />
            </div>
          </div>
          
          {/* Quick Tags */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {[
              t("quickTagUserInterface"),
              t("quickTagArrows"),
              t("quickTagSocial"),
              t("quickTagDevelopment"),
              t("quickTagWeather"),
            ].map((tag, i) => (
              <motion.button
                key={tag}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                onClick={() => onSearch(tag)}
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-secondary/50 hover:bg-secondary hover:text-secondary-foreground text-muted-foreground transition-colors border border-transparent hover:border-border"
              >
                {tag}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Footer Text */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 text-xs text-muted-foreground/50 tracking-widest uppercase font-semibold"
      >
        {t("designedForCreators")}
      </motion.div>
    </div>
  );
};
