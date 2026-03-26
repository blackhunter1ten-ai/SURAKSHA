import { redirect } from "next/navigation";

// The login hub now redirects directly to user login.
export default function LoginHubPage() {
  redirect("/login/user");
}
