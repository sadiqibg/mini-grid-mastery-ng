import type { Metadata } from "next";
import "./globals.css";
import StoreProvider from "@/components/StoreProvider";
import NavBar from "@/components/NavBar";
import RecoveryCodeModal from "@/components/RecoveryCodeModal";

export const metadata: Metadata = {
  title: "Mini-Grid Mastery NG",
  description: "Learn. Build. Defend. Operate. A Nigerian mini-grid learning platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <NavBar />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <RecoveryCodeModal />
        </StoreProvider>
      </body>
    </html>
  );
}
