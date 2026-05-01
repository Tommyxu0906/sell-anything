import { redirect } from "next/navigation";

// Personal tool — no public landing page needed
export default function MarketingPage() {
  redirect("/login");
}
