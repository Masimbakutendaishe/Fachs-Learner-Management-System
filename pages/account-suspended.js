import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "./context/AuthContext";

export default function AccountSuspended() {
  const { institution, signOut } = useAuth();

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white text-gray-900 rounded-2xl shadow-xl p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
          <AlertTriangle size={28} />
        </div>
        <h1 className="text-xl font-semibold">
          {institution?.name || "Your institution"}'s account is suspended
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          This usually happens due to a billing issue with your subscription.
          Contact your institution administrator, or reach out to support if
          you believe this is an error.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          
            href="mailto:support@fachs.example"
            className="w-full py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition"
          >
            Contact Support
          </a>
          <button
            onClick={signOut}
            className="w-full py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}