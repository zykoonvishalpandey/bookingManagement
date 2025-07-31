// app/(fullpages)/login/page.tsx
"use client";

import signInWithGoogle from "@/app/(fullpages)/auth/actions";
import { useEffect } from "react";
import IsSessionActive from "@/app/api/validators/sessionData";
import { useRouter } from "next/navigation";

export default function SignIn(props) {
  const router = useRouter();
  useEffect(() => {
    const checkSession = async () => {
      const session = await IsSessionActive();
      if (session.status) {
        // User is already signed in, redirect or show a message
        router.push("/dashboard");
      }
    };
    checkSession();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-2xl font-bold text-gray-800 text-center">
          Sign in to Your Account
        </h1>
        <form action={signInWithGoogle} className="flex flex-col gap-4">
          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g>
                <path
                  d="M44.5 20H24V28.5H36.9C36.1 32 33.1 34.5 29.5 34.5C25.4 34.5 22 31.1 22 27C22 22.9 25.4 19.5 29.5 19.5C31.2 19.5 32.7 20.1 33.9 21.1L39.1 16.1C36.8 14.1 33.4 13 29.5 13C21.8 13 15.5 19.3 15.5 27C15.5 34.7 21.8 41 29.5 41C36.2 41 41.5 35.7 41.5 29C41.5 27.7 41.4 26.4 41.1 25.2H24V20H44.5Z"
                  fill="#4285F4"
                />
              </g>
            </svg>
            Continue with Google
          </button>
        </form>
      </div>
    </div>
  );
}
