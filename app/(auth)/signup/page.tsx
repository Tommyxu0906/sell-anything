import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signUp } from "@/lib/auth/actions";

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Start for free</CardTitle>
        <CardDescription>Create your account — no credit card required</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signUp} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Company name</label>
            <Input name="orgName" placeholder="Acme Corp" required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Work email</label>
            <Input name="email" type="email" placeholder="you@company.com" required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Password</label>
            <Input name="password" type="password" placeholder="8+ characters" minLength={8} required />
          </div>
          <Button className="w-full" type="submit">
            Create account — it&apos;s free
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            By signing up you agree to our{" "}
            <Link href="/terms" className="underline">Terms</Link> and{" "}
            <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
