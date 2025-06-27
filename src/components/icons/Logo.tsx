import { MortarPestle } from 'lucide-react';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-primary ${className}`}>
      <MortarPestle className="h-8 w-8" />
      <span className="text-xl font-bold font-headline">LP Pharmacy</span>
    </div>
  );
}
