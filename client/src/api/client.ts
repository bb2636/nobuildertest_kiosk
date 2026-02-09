import { AUTH_STORAGE_KEY, type AuthUser } from '../contexts/AuthContext';

const API = '/api';

type StoredAuth = { accessToken?: string; refreshToken?: string; user?: unknown };

function getStored(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

function getAuthToken(): string | null {
  const data = getStored();
  return data?.accessToken ?? null;
}

const AUTH_SESSION_EXPIRED = 'auth:sessionExpired';

function clearAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED));
}

/** Refresh 토큰으로 Access 재발급 후 저장 (로테이션으로 refreshToken도 갱신됨) */
async function refreshAndSave(): Promise<string | null> {
  const data = getStored();
  const refreshToken = data?.refreshToken;
  if (!refreshToken) return null;
  const res = await fetch(`${API}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { accessToken: string; refreshToken: string };
  if (!body.accessToken || !body.refreshToken) return null;
  const next = { ...data, accessToken: body.accessToken, refreshToken: body.refreshToken };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
  return body.accessToken;
}

async function request<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string> }
): Promise<T> {
  const { params, ...init } = options ?? {};
  const url = params ? `${API}${path}?${new URLSearchParams(params)}` : `${API}${path}`;
  const headers: HeadersInit = { 'Content-Type': 'application/json', ...init.headers };
  const token = getAuthToken();
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...init, headers });

  if (res.status === 401) {
    const newToken = await refreshAndSave();
    if (newToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
      const retryRes = await fetch(url, { ...init, headers });
      if (retryRes.status === 401) {
        clearAuth();
        throw new Error('unauthorized');
      }
      if (!retryRes.ok) {
        const err = await retryRes.json().catch(() => ({ error: retryRes.statusText }));
        throw new Error((err as { error?: string }).error ?? 'Request failed');
      }
      if (retryRes.status === 204) return undefined as T;
      return retryRes.json();
    }
    clearAuth();
    throw new Error('unauthorized');
  }

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
    /** 주문 생성. orderType: 매장(DINE_IN)/포장(TAKE_OUT). 로그인 시 포인트 10% 적립. usePoint: 매장 포인트 사용액. paymentMethod 'TOSS'면 PENDING 생성 후 토스 결제창 호출용. */
    createOrder: (body: {
      totalPrice: number;
      items: { productId: string; quantity: number; optionIds: string[] }[];
      orderType?: 'DINE_IN' | 'TAKE_OUT';
      paymentMethod?: 'CARD' | 'CASH' | 'MOBILE' | 'ETC' | 'TOSS';
      usePoint?: number;
    }) =>
      request<{ orderNumber: number; orderNo: string; orderId: string; pointsEarned?: number }>('/orders', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },

  payments: {
    /** 토스 결제 승인 (성공 URL에서 호출) */
    confirm: (body: { paymentKey: string; orderId: string; amount: number }) =>
      request<{ orderNo: string; pointsEarned?: number }>('/payments/confirm', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },

  auth: {
    login: (body: { username: string; password: string }) =>
      request<{ accessToken: string; refreshToken: string; user: AuthUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    register: (body: { name: string; username: string; email: string; password: string }) =>
      request<{ user: AuthUser }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    findId: (body: { name: string; email: string }) =>
      request<{ username: string }>('/auth/find-id', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    findPassword: (body: { name: string; username: string; email: string }) =>
      request<{ success: boolean }>('/auth/find-password', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },

  /** 로그인 사용자 마이페이지 (JWT 필요) */
  user: {
    me: () =>
      request<{
        name: string;
        username: string;
        email: string;
        point: number;
        mileage: number;
        notificationEnabled: boolean;
        marketingConsent: boolean;
      }>('/user/me'),
    orders: (params?: { status?: string; from?: string; to?: string }) =>
      request<UserOrderItem[]>(
        '/user/orders',
        params && Object.keys(params).length > 0
          ? { params: Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== '')) as Record<string, string> }
          : undefined
      ),
    update: (body: { email?: string; currentPassword?: string; newPassword?: string }) =>
      request<{ success: boolean }>('/user/update', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    settings: (body: { notificationEnabled?: boolean; marketingConsent?: boolean }) =>
      request<{ notificationEnabled: boolean; marketingConsent: boolean }>('/user/settings', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
  },

  /** 관리자 전용 (JWT 필요, role ADMIN) */
  admin: {
    orders: {
      list: (status?: string) =>
        request<AdminOrderListItem[]>(
          '/admin/orders',
          status ? { params: { status } } : undefined
        ),
      updateStatus: (id: string, status: string) =>
        request<Order>(`/admin/orders/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }),
    },
    products: {
      list: () =>
        request<(MenuItem & { category: { id: string; name: string }; isAvailable?: boolean })[]>(
          '/admin/products'
        ),
      create: (body: {
        categoryId: string;
        name: string;
        englishName?: string;
        description?: string;
        basePrice: number;
        imageUrl?: string;
        ingredients?: string;
        calories?: string;
        isAvailable?: boolean;
        sortOrder?: number;
        isBest?: boolean;
        defaultShotCount?: number;
      }) =>
        request<MenuItem & { category: { id: string; name: string } }>('/admin/products', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      update: (
        id: string,
        body: { isAvailable?: boolean; name?: string; basePrice?: number; sortOrder?: number }
      ) => request<MenuItem>(`/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
      delete: (id: string) => request<void>(`/admin/products/${id}`, { method: 'DELETE' }),
    },
    categories: {
      list: () => request<{ id: string; name: string; sortOrder: number }[]>('/categories'),
      create: (body: { name: string; isActive?: boolean; sortOrder?: number }) =>
        request<{ id: string }>('/categories', { method: 'POST', body: JSON.stringify(body) }),
      update: (id: string, body: { name?: string; isActive?: boolean; sortOrder?: number }) =>
        request(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
      delete: (id: string) => request(`/categories/${id}`, { method: 'DELETE' }),
    },
  },
};

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  englishName: string | null;
  description: string | null;
  basePrice: number;
  isSoldOut: boolean;
  isBest: boolean;
  defaultShotCount: number | null;
  sortOrder: number;
  category: { id: string; name: string };
  images: { id: string; url: string; sortOrder: number }[];
  options: { id: string; name: string; type: string; choices: string | null; extraPrice: number }[];
};

export type Order = {
  id: string;
  orderNo: string;
  orderNumber: number | null;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: {
    id: string;
    quantity: number;
    lineTotalAmount: number;
    product: { name: string };
  }[];
};

/** GET /api/user/orders 응답 항목 (해당 로그인 유저 주문만) */
export type UserOrderItem = {
  id: string;
  orderNo: string;
  orderNumber: number | null;
  status: string;
  orderType: 'DINE_IN' | 'TAKE_OUT';
  totalAmount: number;
  createdAt: string;
  items: { id: string; productName: string; quantity: number; lineTotalAmount: number; optionNames?: string[] }[];
};

/** GET /api/admin/orders 응답 항목 (items[].productName) */
export type AdminOrderListItem = {
  id: string;
  orderNo: string;
  orderNumber: number | null;
  orderType: 'DINE_IN' | 'TAKE_OUT';
  status: string;
  totalAmount: number;
  createdAt: string;
  customerName?: string;
  items: { productName: string; quantity: number; lineTotalAmount: number; optionNames?: string[] }[];
};
