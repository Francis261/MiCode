export interface ProductOrderItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface ProductOrder {
  _id: string;
  orderId: string;
  products: ProductOrderItem[];
  totalAmount: number;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  paymentMethod?: string;
  customerEmail?: string;
  customerName?: string;
  downloadLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductOrderResponse {
  order: ProductOrder;
}
