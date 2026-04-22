export type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  stock: number;
  cost: number;
};

export type SalesPost = {
  id: string;
  inventory_item_id: string;
  title: string;
  description: string | null;
  sale_price: number;
  status: "draft" | "published" | "paused";
};
