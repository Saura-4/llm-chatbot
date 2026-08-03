import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = { title: "LLM Chatbot", description: "A streaming AI chat application" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { 
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>{children}</body>
    </html>
  ); 
}
