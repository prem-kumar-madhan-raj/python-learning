export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  qty: number;
  tenant_id: number;
}

export interface ProductCreateInput {
  name: string;
  description: string;
  price: number;
  qty: number;
}

export type ProductUpdateInput = Partial<ProductCreateInput>;

export const LOW_STOCK_THRESHOLD = 10;