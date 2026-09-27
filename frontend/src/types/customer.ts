export interface Customer {
  id: number;
  name: string;
  phone: string;
  gstin: string | null;
  tenant_id: number;
}

export interface CustomerCreateInput {
  name: string;
  phone: string;
  gstin?: string | null;
}

export type CustomerUpdateInput = Partial<CustomerCreateInput>;