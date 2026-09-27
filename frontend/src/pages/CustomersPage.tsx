import { useState } from "react";
import { Plus, Users, Pencil, Trash2 } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { TableSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import CustomerFormModal from "../components/customers/CustomerFormModal";
import { useCustomersQuery, useDeleteCustomerMutation } from "../hooks/useCustomers";
import type { Customer } from "../types/customer";
import { useAuth } from "../context/AuthContext";

export default function CustomersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  // Both admin and cashier can create — matches POST /customers on the backend.
  // Only admin can edit/delete — matches PUT and DELETE /customers/{id}.
  const canCreate = user?.role === "admin" || user?.role === "cashier";

  const { data: customers, isLoading, isError, error } = useCustomersQuery();
  const deleteMutation = useDeleteCustomerMutation();

  const [modalState, setModalState] = useState<{ open: boolean; customer?: Customer }>({
    open: false,
  });

  function handleDelete(customer: Customer) {
    if (window.confirm(`Delete "${customer.name}"? This can't be undone.`)) {
      deleteMutation.mutate(customer.id);
    }
  }

  return (
    <AppLayout title="Customers">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {customers ? `${customers.length} customer${customers.length === 1 ? "" : "s"}` : ""}
        </p>
        {canCreate && (
          <button onClick={() => setModalState({ open: true })} className="btn-primary gap-2">
            <Plus className="h-4 w-4" />
            Add customer
          </button>
        )}
      </div>

      {isLoading && <TableSkeleton columns={isAdmin ? 4 : 3} />}

      {isError && (
        <div className="card px-6 py-5 text-sm text-red-700">
          Failed to load customers: {error.message}
        </div>
      )}

      {!isLoading && !isError && customers && customers.length === 0 && (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Add a customer to start billing them — walk-ins or regulars, phone number is enough to get started."
          action={
            canCreate && (
              <button onClick={() => setModalState({ open: true })} className="btn-primary gap-2">
                <Plus className="h-4 w-4" />
                Add customer
              </button>
            )
          }
        />
      )}

      {!isLoading && !isError && customers && customers.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">GSTIN</th>
                {isAdmin && <th className="px-6 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-neutral-50/60">
                  <td className="px-6 py-4 font-medium text-neutral-900">{customer.name}</td>
                  <td className="px-6 py-4 text-neutral-700">{customer.phone}</td>
                  <td className="px-6 py-4 text-neutral-500">
                    {customer.gstin ?? <span className="italic text-neutral-400">Not provided</span>}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setModalState({ open: true, customer })}
                          className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer)}
                          className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalState.open && (
        <CustomerFormModal
          customer={modalState.customer}
          onClose={() => setModalState({ open: false })}
        />
      )}
    </AppLayout>
  );
}