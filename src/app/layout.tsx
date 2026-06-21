import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
import { Fab } from "@/components/Fab";
import "./globals.css";

const baloo = Baloo_2({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const nunito = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Mathletic | Practice Mode",
  description:
    "Gamified HSC, IB, AP, and A-Level mathematics practice with speed rounds and boss checks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${baloo.variable} ${nunito.variable} antialiased min-h-screen flex flex-col`}>
        <div className="app-wrap flex flex-col flex-1">
          <AppHeader />
          <main className="flex-1 w-full">{children}</main>
          <footer className="app-footer">
            Mathletic — HSC, IB, AP & A-Level practice
          </footer>
        </div>
        <Fab />
      </body>
    </html>
  );
}
