import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Capco AI News Intelligence",
  description: "Editorial intelligence workspace for weekly AI signals.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
