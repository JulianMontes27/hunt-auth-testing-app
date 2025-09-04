import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Payment testing checkout",
  description: "Testing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div>
    {children}
  </div>;
}
