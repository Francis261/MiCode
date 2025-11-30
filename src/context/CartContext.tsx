import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the Product interface as it comes from the backend
interface Product {
  _id: string; // MongoDB ID
  id: string; // Original static ID, if still needed for some logic
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  tags: string[];
  rating: number;
  reviews: number;
  languageFramework?: string;
  templateType?: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addItemToCart: (product: Product) => void;
  removeItemFromCart: (productId: string) => void;
  clearCart: () => void;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addItemToCart = (product: Product) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item._id === product._id);
      if (existingItem) {
        return prevItems.map((item) =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevItems, { ...product, quantity: 1 }];
      }
    });
  };

  const removeItemFromCart = (productId: string) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item._id === productId);
      if (existingItem && existingItem.quantity > 1) {
        return prevItems.map((item) =>
          item._id === productId ? { ...item, quantity: item.quantity - 1 } : item
        );
      } else {
        return prevItems.filter((item) => item._id !== productId);
      }
    });
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ cartItems, addItemToCart, removeItemFromCart, clearCart, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};