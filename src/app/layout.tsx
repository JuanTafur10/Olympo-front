import type { ReactNode } from "react";
import Script from "next/script";
import Providers from "./providers";
import "./globals.css";
import "../index.css";

export const metadata = {
  title: "Olympo",
  description: "Plataforma Olympo para emprendedores e inversionistas",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js" strategy="beforeInteractive" />
        <Script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js" strategy="beforeInteractive" />
        <Script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js" strategy="beforeInteractive" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
