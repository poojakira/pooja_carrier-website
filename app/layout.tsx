import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carrier OS",
  description: "A human-in-the-loop career operations workspace for evaluating jobs, improving resumes, building application kits, and tracking outcomes."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
