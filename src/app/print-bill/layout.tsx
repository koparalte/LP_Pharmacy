
import type { ReactNode } from 'react';
import '../globals.css'; // Ensure it can access global print styles

export const metadata = {
  title: 'Print Bill',
};

export default function PrintLayout({ children }: { children: ReactNode }) {
  // The <html> and <body> tags are provided by the root layout.
  // This layout should only return its specific children.
  // If specific body styling is needed for this page during print,
  // it should be applied dynamically from the page component itself
  // (e.g., using useEffect in page.tsx to add a class to document.body).
  return <>{children}</>;
}
