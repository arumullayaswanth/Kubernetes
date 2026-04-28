export type User = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  user_id: string;
  item: string;
  quantity: number;
  amount: number;
  status: string;
  created_at: string;
};

export type Payment = {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
};
