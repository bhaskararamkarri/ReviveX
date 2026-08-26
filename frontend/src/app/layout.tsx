import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

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
        <Sidebar />
        <main className="flex-1 h-screen overflow-y-auto p-8 relative">
          {/* Subtle background glow effect */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
          {children}
        </main>
      </body>
    </html>
  );
}
