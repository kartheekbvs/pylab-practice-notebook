import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-sans-override",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-override",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PyLab — Python & Data Science Practice Notebook",
  description:
    "Learn Python, NumPy, Pandas, Matplotlib, Seaborn, Scikit-Learn and more in a real in-browser notebook kernel. 73 concepts, 314 HackerRank-style exercises with live test cases, instant grading, XP and streaks.",
  keywords: [
    "Python practice", "NumPy exercises", "Pandas exercises", "coding practice",
    "notebook editor", "learn data science", "Python playground",
  ],
  icons: { icon: "/pylab-icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0d1512",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
