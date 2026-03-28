import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/components/landing/landing.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ChronoSync | The Ultimate Collaborative Schedule Intelligence",
  description:
    "Unite schedules, track hourly work, and let AI optimize your time — for teams, couples, and academia.",
};

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={inter.variable}>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"
      />
      {children}
    </div>
  );
}
