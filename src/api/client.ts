const API = '/api';

async function request<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string> }
): Promise<T> {
  const { params, ...init } = options ?? {};
  const url = params ? `${API}${path}?${new URLSearchParams(params)}` : `${API}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  health: () => request<{ ok: boolean; db: string }>('/health'),

  categories: {
    list: () => request<{ id: string; name: string; sortOrder: number }[]>('/categories'),
    create: (body: { name: string; isActive?: boolean; sortOrder?: number }) =>
      request<{ id: string }>('/categories', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: { name?: string; isActive?: boolean; sortOrder?: number }) =>
      request(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => request(`/categories/${id}`, { method: 'DELETE' }),
  },

  menu: {
    list: (categoryId?: string) =>
      request<MenuItem[]>('/menu', categoryId ? { params: { categoryId } } : undefined),
    get: (id: string) => request<MenuItem>(`/menu/${id}`),
    create: (body: {
      categoryId: string;
      name: string;
      description?: string;
      basePrice: number;
      isSoldOut?: boolean;
      sortOrder?: number;
    }) => request<{ id: string }>('/menu', { method: 'POST', body: JSON.stringify(body) }),
    update: (
      id: string,
      body: { name?: string; description?: string; basePrice?: number; isSoldOut?: boolean; sortOrder?: number }
    ) => request(`/menu/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => request(`/menu/${id}`, { method: 'DELETE' }),
  },

  orders: {
    /** 주문 생성 (totalPrice + 상품/수량/옵션). 트랜잭션 처리, 성공 시 orderNumber 반환 */
    createOrder: (body: {
      totalPrice: number;
      items: { productId: string; quantity: number; optionIds: string[] }[];
    }) =>
      request<{ orderNumber: number; orderNo: string; orderId: string }>('/orders', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    create: (body: {
      items: { itemId: string; quantity: number; unitPrice: number; optionsJson?: string }[];
    }) => request<Order>('/orders', { method: 'POST', body: JSON.stringify(body) }),
    list: (status?: string) =>
      request<Order[]>('/orders', status ? { params: { status } } : undefined),
    updateStatus: (id: string, status: string) =>
      request<Order>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },
};

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  basePrice: number;
  isSoldOut: boolean;
  sortOrder: number;
  category: { id: string; name: string };
  images: { id: string; url: string; sortOrder: number }[];
  options: { id: string; name: string; type: string; choices: string | null; extraPrice: number }[];
};

export type Order = {
  id: string;
  orderNo: string;
  status: string;
  totalPrice: number;
  createdAt: string;
  items: { id: string; quantity: number; unitPrice: number; optionsJson: string | null; item: { name: string } }[];
};
