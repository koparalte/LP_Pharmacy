
import type { ReactNode } from 'react';
import '../globals.css'; // Ensure it can access global print styles

export const metadata = {
  title: 'Print Bill',
};

export default function PrintLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="print-body-override"> {/* Class for potential specific print body styling */}
        {children}
      </body>
    </html>
  );
}
