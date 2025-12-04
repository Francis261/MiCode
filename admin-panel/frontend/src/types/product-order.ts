export interface ProductItem {
  productId: string; // The static 'id' from the Product model
  title: string;
  price: number;
  quantity: number;
  image?: string;
  category?: string;
}

export interface ProductOrder {
  _id: string;
  orderId: string; // Unique ID from OxaPay
  clientName: string;
  clientEmail: string;
  totalAmount: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: string;
  transactionId?: string; // OxaPay's track_id
  products: ProductItem[];
  downloadLink?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductOrdersResponse {
  orders: ProductOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}