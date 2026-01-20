"use client";

import React, { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform, Variants } from "framer-motion";
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
  
  // Use MotionValues instead of state to avoid re-renders
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for the blob movement
  const springConfig = { damping: 50, stiffness: 50 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  // Transforms for different elements based on mouse position
  const x1 = useTransform(springX, [0, 1], [0, 50]);
  const y1 = useTransform(springY, [0, 1], [0, 50]);
  
  const x2 = useTransform(springX, [0, 1], [0, -50]);
  const y2 = useTransform(springY, [0, 1], [0, -50]);

  const bgX = useTransform(springX, [0, 1], [0, -20]);
  const bgY = useTransform(springY, [0, 1], [0, -20]);

  const [isMounted, setIsMounted] = React.useState(false);

  useEffect(() => {
    // Delay setting isMounted to ensure hydration is complete and browser has painted
    const timer = requestAnimationFrame(() => {
      setIsMounted(true);
    });

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize coordinates to 0-1 range
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(timer);
    };
  }, [mouseX, mouseY]);

  // Container variants for staggered animation
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 50,
        damping: 20
      }
    },
  };

  const titleVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 40,
        damping: 15,
        mass: 1.2
      }
    },
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-background">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
        <motion.div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: '4rem 4rem',
            x: bgX,
            y: bgY
          }}
        />
      </div>

      {/* Gradient Blobs */}
      <motion.div 
        className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none"
        style={{
          x: x1,
          y: y1,
        }}
      />
      <motion.div 
        className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[120px] pointer-events-none"
        style={{
          x: x2,
          y: y2,
        }}
      />

      <motion.div 
        className="relative z-10 w-full max-w-5xl px-6 flex flex-col items-center"
        variants={containerVariants}
        initial="hidden"
        animate={isMounted ? "show" : "hidden"}
      >
        {/* Main Title */}
        <div className="mb-12 relative">
          <motion.h1 
            variants={titleVariants}
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
            variants={itemVariants}
            className="absolute -top-6 -right-8 md:-right-16 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full border-2 border-background shadow-xl hidden sm:block z-30"
          >
            v0.2.0
          </motion.div>
        </div>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="text-lg md:text-2xl text-muted-foreground text-center max-w-xl mb-12 font-medium tracking-tight leading-relaxed"
        >
          {t('subtitle')}
        </motion.p>

        {/* Search Area */}
        <motion.div
          variants={itemVariants}
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
            ].map((tag) => (
              <motion.button
                key={tag}
                variants={itemVariants}
                onClick={() => onSearch(tag)}
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-secondary/50 hover:bg-secondary hover:text-secondary-foreground text-muted-foreground transition-colors border border-transparent hover:border-border"
              >
                {tag}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Footer Text */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-8 text-xs text-muted-foreground/50 tracking-widest uppercase font-semibold"
      >
        {t("designedForCreators")}
      </motion.div>
    </div>
  );
};
