import type { Order, Payment, User } from "../types";

const jsonHeaders = () => ({
  "Content-Type": "application/json",
  "x-correlation-id": crypto.randomUUID()
});

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...jsonHeaders(),
      ...(init?.headers ?? {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.error || "Request failed");
  }

  return payload.data as T;
}

export const api = {
  listUsers: (): Promise<User[]> => request<User[]>("/api/users"),
  createUser: (body: { name: string; email: string }): Promise<User> =>
    request<User>("/api/users", { method: "POST", body: JSON.stringify(body) }),
  listOrders: (): Promise<Order[]> => request<Order[]>("/api/orders"),
  createOrder: (body: { user_id: string; item: string; quantity: number; amount: number }): Promise<Order> =>
    request<Order>("/api/orders", { method: "POST", body: JSON.stringify(body) }),
  listPayments: (): Promise<Payment[]> => request<Payment[]>("/api/payments"),
  createPayment: (body: { orderId: string; amount: number; method: string }): Promise<Payment> =>
    request<Payment>("/api/payments", { method: "POST", body: JSON.stringify(body) })
};
