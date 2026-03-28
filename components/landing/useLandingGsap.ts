"use client";

import { type RefObject, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Scroll reveals + ScrollTrigger tweens + floating hero title — mirrors original landing scripts.
 */
export function useLandingGsap(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    gsap.registerPlugin(ScrollTrigger);

    const faders = root.querySelectorAll(".landing-fade-up");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("landing-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 },
    );
    faders.forEach((el) => observer.observe(el));

    root.querySelectorAll(".landing-feature-card").forEach((card) => {
      gsap.fromTo(
        card,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          scrollTrigger: { trigger: card, start: "top 85%" },
        },
      );
    });

    const showcase = root.querySelector(".landing-ai-showcase");
    if (showcase) {
      gsap.fromTo(
        showcase,
        { scale: 0.97, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 1,
          scrollTrigger: { trigger: showcase, start: "top 80%" },
        },
      );
    }

    const steps = root.querySelector(".landing-steps");
    const stepEls = root.querySelectorAll(".landing-step");
    if (steps && stepEls.length) {
      gsap.fromTo(
        stepEls,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.1,
          scrollTrigger: { trigger: steps, start: "top 80%" },
        },
      );
    }

    const heroTitle = root.querySelector(".landing-hero-content h1");
    const heroTween =
      heroTitle &&
      gsap.to(heroTitle, {
        y: -5,
        duration: 2.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

    return () => {
      observer.disconnect();
      ScrollTrigger.getAll().forEach((st) => st.kill());
      if (heroTween) heroTween.kill();
    };
  }, [rootRef]);
}
