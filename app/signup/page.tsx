import { redirect } from "next/navigation";

// The volunteer form on /en/join is the single sign-up path: it creates the
// login account. Keep this route alive as a redirect so old links don't 404.
export default function SignupPage() {
  redirect("/en/join#form");
}