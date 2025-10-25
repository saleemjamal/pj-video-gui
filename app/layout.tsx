import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PJ Video Generator",
  description: "AI-powered video generation for Poppat Jamals heritage homeware",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
