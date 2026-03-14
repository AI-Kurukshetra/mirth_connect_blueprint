import type { Metadata } from "next";

import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedFlow | Healthcare Integration Command Center",
  description: "MedFlow unifies HL7, FHIR, channel operations, message visibility, and connector monitoring in one operational surface.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
