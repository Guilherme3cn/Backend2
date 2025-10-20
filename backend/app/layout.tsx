import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EcoHome Tuya Backend",
  description: "Backend API for Tuya integration demo"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
