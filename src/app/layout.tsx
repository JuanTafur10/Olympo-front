import type { ReactNode } from "react";
import Providers from "./providers";
import "../index.css";

export const metadata = {
  title: "AMBROSIA",
  description: "AMBROSIA - Plataforma de emprendimiento e inversión",
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
