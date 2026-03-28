"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { DemoSection } from "@/components/landing/DemoSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { Footer } from "@/components/landing/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { LifeLearningSection } from "@/components/landing/LifeLearningSection";
import { Navbar } from "@/components/landing/Navbar";
import { StepsSection } from "@/components/landing/StepsSection";
import { useLandingGsap } from "@/components/landing/useLandingGsap";

const ThreeBackground = dynamic(
  () =>
    import("@/components/auth/three-background").then((m) => ({
      default: m.ThreeBackground,
    })),
  { ssr: false, loading: () => null },
);

export function LandingPageClient() {
  const rootRef = useRef<HTMLDivElement>(null);
  useLandingGsap(rootRef);

  return (
    <div ref={rootRef} className="landing-root">
      <ThreeBackground />
      <div className="landing-content">
        <Navbar />
        <HeroSection />
        <FeaturesSection />
        <DemoSection />
        <LifeLearningSection />
        <StepsSection />
        <div className="landing-final-cta">
          <p>
            <i className="fas fa-sync-alt" aria-hidden /> One platform to sync your
            world — from boardrooms to living rooms.
          </p>
        </div>
        <Footer />
      </div>
    </div>
  );
}
