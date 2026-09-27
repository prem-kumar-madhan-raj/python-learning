import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { Customer, CustomerCreateInput } from "../../types/customer";
import { useCreateCustomerMutation, useUpdateCustomerMutation } from "../../hooks/useCustomers";

export default function CustomerFormModal({
  customer,
  onClose,
}: {
  customer?: Customer;
  onClose: () => void;
}) {
  const isEditing = Boolean(customer);
  const [form, setForm] = useState<CustomerCreateInput>({
    name: customer?.name ?? "",
    phone: customer?.phone ?? "",
    gstin: customer?.gstin ?? "",
  });

  const createMutation = useCreateCustomerMutation();
  const updateMutation = useUpdateCustomerMutation();
  const mutation = isEditing ? updateMutation : createMutation;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Empty string -> null: an empty GSTIN field means "not provided," not "provided as blank text."
    const payload = { ...form, gstin: form.gstin?.trim() ? form.gstin.trim() : null };

    if (isEditing && customer) {
      updateMutation.mutate({ id: customer.id, payload }, { onSuccess: onClose });
    } else {
      createMutation.mutate(payload, { onSuccess: onClose });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900">
            {isEditing ? "Edit customer" : "New customer"}
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Name</label>
            <input
              required
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Phone</label>
            <input
              required
              className="input-field"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              GSTIN <span className="font-normal text-neutral-400">(optional, for B2B invoices)</span>
            </label>
            <input
              className="input-field"
              placeholder="e.g. 29ABCDE1234F1Z5"
              value={form.gstin ?? ""}
              onChange={(e) => setForm({ ...form, gstin: e.target.value })}
            />
          </div>

          {mutation.isError && (
            <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {mutation.error.message}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? "Saving…" : isEditing ? "Save changes" : "Create customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}