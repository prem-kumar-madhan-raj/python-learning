import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { Product, ProductCreateInput } from "../../types/product";
import { useCreateProductMutation, useUpdateProductMutation } from "../../hooks/useProducts";

export default function ProductFormModal({
  product,
  onClose,
}: {
  product?: Product;
  onClose: () => void;
}) {
  const isEditing = Boolean(product);
  const [form, setForm] = useState<ProductCreateInput>({
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product?.price ?? 0,
    qty: product?.qty ?? 0,
  });

  const createMutation = useCreateProductMutation();
  const updateMutation = useUpdateProductMutation();
  const mutation = isEditing ? updateMutation : createMutation;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isEditing && product) {
      updateMutation.mutate({ id: product.id, payload: form }, { onSuccess: onClose });
    } else {
      createMutation.mutate(form, { onSuccess: onClose });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900">
            {isEditing ? "Edit product" : "New product"}
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
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Description</label>
            <input
              required
              className="input-field"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">Price</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                className="input-field"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">Quantity</label>
              <input
                required
                type="number"
                min="0"
                className="input-field"
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })}
              />
            </div>
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
              {mutation.isPending ? "Saving…" : isEditing ? "Save changes" : "Create product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}