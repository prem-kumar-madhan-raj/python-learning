import { useState } from "react";
import { Plus, Package, Pencil, Trash2 } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { TableSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import ProductFormModal from "../components/products/ProductFormModal";
import { useProductsQuery, useDeleteProductMutation } from "../hooks/useProducts";
import { LOW_STOCK_THRESHOLD, type Product } from "../types/product";
import { useAuth } from "../context/AuthContext";

export default function ProductsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: products, isLoading, isError, error } = useProductsQuery();
  const deleteMutation = useDeleteProductMutation();

  const [modalState, setModalState] = useState<{ open: boolean; product?: Product }>({
    open: false,
  });

  function handleDelete(product: Product) {
    if (window.confirm(`Delete "${product.name}"? This can't be undone.`)) {
      deleteMutation.mutate(product.id);
    }
  }

  return (
    <AppLayout title="Products">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {products ? `${products.length} product${products.length === 1 ? "" : "s"} in inventory` : ""}
        </p>
        {isAdmin && (
          <button onClick={() => setModalState({ open: true })} className="btn-primary gap-2">
            <Plus className="h-4 w-4" />
            Add product
          </button>
        )}
      </div>

      {isLoading && <TableSkeleton columns={isAdmin ? 5 : 4} />}

      {isError && (
        <div className="card px-6 py-5 text-sm text-red-700">
          Failed to load products: {error.message}
        </div>
      )}

      {!isLoading && !isError && products && products.length === 0 && (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add your first product to start tracking inventory and creating invoices."
          action={
            isAdmin && (
              <button onClick={() => setModalState({ open: true })} className="btn-primary gap-2">
                <Plus className="h-4 w-4" />
                Add product
              </button>
            )
          }
        />
      )}

      {!isLoading && !isError && products && products.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Price</th>
                <th className="px-6 py-3">Stock</th>
                {isAdmin && <th className="px-6 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {products.map((product) => {
                const isLowStock = product.qty < LOW_STOCK_THRESHOLD;
                return (
                  <tr key={product.id} className="hover:bg-neutral-50/60">
                    <td className="px-6 py-4 font-medium text-neutral-900">{product.name}</td>
                    <td className="max-w-xs truncate px-6 py-4 text-neutral-500">
                      {product.description}
                    </td>
                    <td className="px-6 py-4 text-neutral-700">₹{product.price.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          isLowStock ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {product.qty} {isLowStock && "· Low stock"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setModalState({ open: true, product })}
                            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product)}
                            className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalState.open && (
        <ProductFormModal
          product={modalState.product}
          onClose={() => setModalState({ open: false })}
        />
      )}
    </AppLayout>
  );
}