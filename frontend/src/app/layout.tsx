import type { Metadata } from "next";
import localFont from 'next/font/local'
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

import { Header } from "@/components/Header";

import { ThemeProvider } from "@/components/ThemeProvider";

const inter = localFont({
  src: '../fonts/Inter-Regular.woff2',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "ReviveX | Autonomous Revenue Recovery",
  description: "Next-generation revenue recovery for Razorpay",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased min-h-screen flex`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Sidebar />
          <div className="flex-1 flex flex-col h-screen overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-8 relative">
              {/* Subtle background glow effect */}
              <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
