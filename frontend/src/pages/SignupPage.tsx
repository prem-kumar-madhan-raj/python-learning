import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSignupMutation } from "../hooks/useAuthMutations";
import { useAuth } from "../context/AuthContext";
import { AuthLayout } from "../components/AuthLayout";

export default function SignupPage() {
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const signupMutation = useSignupMutation();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    signupMutation.mutate(
      { business_name: businessName, email, password , name},
      {
        onSuccess: (data) => {
          login(data.access_token);
          navigate("/products");
        },
      },
    );
  }

  return (
    <AuthLayout
      title="Create your business"
      subtitle="Get your StockFlow workspace set up in seconds"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Business name
          </label>
          <input
            required
            className="input-field"
            placeholder="Prem Stationery"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Name
          </label>
          <input
            type="email"
            required
            className="input-field"
            placeholder="Prem Kumar"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Email
          </label>
          <input
            type="email"
            required
            className="input-field"
            placeholder="you@business.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            className="input-field"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {signupMutation.isError && (
          <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {signupMutation.error.message}
          </div>
        )}

        <button
          type="submit"
          disabled={signupMutation.isPending}
          className="btn-primary w-full"
        >
          {signupMutation.isPending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
