import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RhythmScope — Beyond the Prediction | ECG Model Reliability Laboratory",
  description: "A research-grade ML engineering study evaluating ECG heartbeat classifiers under unseen patient generalization, realistic PhysioNet NSTDB noise corruption, and development-calibrated abstention.",
  keywords: ["ECG", "Machine Learning", "MIT-BIH", "TrustLab", "Model Reliability", "Abstention", "1D CNN"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-canvas text-primary font-sans antialiased selection:bg-teal selection:text-white">
        {children}
      </body>
    </html>
  );
}
