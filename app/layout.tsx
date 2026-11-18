import type { Metadata } from "next";
import "./globals.css";
import { Footer, Header } from "@/components/ui";
import VerificationGate from "@/components/verification-gate";

export const metadata: Metadata = {
  title: "Hustly — Your Campus. Your Hustle.",
  description: "A verified same-university marketplace where students offer and find services on their own campus. Hustly never holds money — buyer and seller arrange payment directly.",
  metadataBase: new URL("https://hustlyapp.vercel.app"),
  openGraph: { title: "Hustly — Your Campus. Your Hustle.", description: "Verified students, same university, real services.", images: ["/logo.jpg"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-ink antialiased">
        <VerificationGate />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
