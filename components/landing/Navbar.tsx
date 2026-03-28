"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function Navbar() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const goLogin = useCallback(() => {
    setMenuOpen(false);
    router.push("/login");
  }, [router]);

  const goSignup = useCallback(() => {
    setMenuOpen(false);
    router.push("/login?tab=signup");
  }, [router]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <nav className="landing-glass-nav" aria-label="Primary">
      <div className="landing-nav-row">
        <div className="landing-logo">
          Chrono<span>Sync</span>
        </div>
        <div className="landing-nav-menu">
          <div className="landing-auth-buttons">
            <button
              type="button"
              className="landing-auth-btn landing-login-btn"
              onClick={goLogin}
            >
              <i className="fas fa-sign-in-alt" aria-hidden /> Log in
            </button>
            <button
              type="button"
              className="landing-auth-btn landing-signup-btn"
              onClick={goSignup}
            >
              <i className="fas fa-user-plus" aria-hidden /> Sign up
            </button>
          </div>
          <button
            type="button"
            className="landing-nav-toggle"
            aria-expanded={menuOpen}
            aria-controls="landing-nav-mobile"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <i className={menuOpen ? "fas fa-times" : "fas fa-bars"} aria-hidden />
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </div>
      <div
        id="landing-nav-mobile"
        className={`landing-nav-mobile-panel${menuOpen ? " landing-nav-mobile-open" : ""}`}
      >
        <button
          type="button"
          className="landing-auth-btn landing-login-btn"
          onClick={goLogin}
        >
          <i className="fas fa-sign-in-alt" aria-hidden /> Log in
        </button>
        <button
          type="button"
          className="landing-auth-btn landing-signup-btn"
          onClick={goSignup}
        >
          <i className="fas fa-user-plus" aria-hidden /> Sign up
        </button>
      </div>
    </nav>
  );
}
