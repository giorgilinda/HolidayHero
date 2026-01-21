import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import BaseLayout from "./templates/BaseTemplate";
import { AuthProvider } from "@/contexts/AuthContext";
import { APP_NAME, APP_DESCRIPTION, APP_EMOJI } from "../utils/constants";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: "#ff6b35",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="icon"
          href={`data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%2210 0 100 100%22><text y=%22.90em%22 font-size=%2290%22>${encodeURIComponent(APP_EMOJI)}</text></svg>`}
        ></link>
      </head>
      <body>
        <AuthProvider>
          <BaseLayout>{children}</BaseLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
