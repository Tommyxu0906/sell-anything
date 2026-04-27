import { Zap } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <Zap className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold">sellAnything</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
