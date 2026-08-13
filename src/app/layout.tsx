import type { Metadata } from "next";
import Link from "next/link";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
import { BackgroundShapes } from "@/components/BackgroundShapes";
import { Fab } from "@/components/Fab";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ProgressProvider } from "@/lib/useProgress";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Mathletic | Practice Platform",
  description:
    "HSC, IB, AP, and A-Level mathematics practice with timed challenges.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${plusJakarta.variable} antialiased min-h-screen flex flex-col`}>
        <ThemeProvider>
          <ProgressProvider>
            <BackgroundShapes />
            <div className="app-wrap flex flex-col flex-1">
              <AppHeader />
              <main className="flex-1 w-full page-main">{children}</main>
              <footer className="app-footer flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                <span>Mathletic — HSC, IB, AP & A-Level practice</span>
                <span className="text-muted-foreground">·</span>
                <Link href="/privacy" className="underline-offset-2 hover:underline">
                  Privacy
                </Link>
                <Link href="/terms" className="underline-offset-2 hover:underline">
                  Terms
                </Link>
              </footer>
            </div>
            <Fab />
          </ProgressProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
