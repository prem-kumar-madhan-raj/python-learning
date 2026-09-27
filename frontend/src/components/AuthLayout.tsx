import type { ReactNode } from "react";

export const AuthLayout = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) => {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-brand-600 to-brand-700 p-12 text-white lg:flex">
        <div className="text-xl font-semibold tracking-tight">StockFlow</div>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">
            Billing and inventory,<br />built for how you actually work.
          </h2>
          <p className="mt-4 max-w-md text-brand-100">
            Multi-tenant, real-time stock, and invoicing — all in one place.
          </p>
        </div>
        <p className="text-sm text-brand-100">© 2026 StockFlow</p>
      </div>
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
          <p className="mt-1.5 text-sm text-neutral-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}