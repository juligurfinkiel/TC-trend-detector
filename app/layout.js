import "./globals.css";

export const metadata = {
  title: "Trend Detector — Turismocity",
  description: "Detectá tendencias de TikTok en tiempo real",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
