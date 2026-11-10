import type { ReactNode } from "react";
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
