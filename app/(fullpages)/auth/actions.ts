// app/(fullpages)/login/actions.ts
"use server";

import { signIn } from "@/auth";

export default async function signInWithGoogle(props) {
  await signIn("google");
}