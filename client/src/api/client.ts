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
const NETWORK_ERROR_EVENT = 'app:network-error';

function clearAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED));
}

function isNetworkError(e: unknown): boolean {
  if (e instanceof TypeError && e.message === 'Failed to fetch') return true;
  if (e instanceof Error && /network|fetch|offline/i.test(e.message)) return true;
  return false;
}

function dispatchNetworkError(): void {
  window.dispatchEvent(new CustomEvent(NETWORK_ERROR_EVENT));
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

  try {
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
          const body = err as { error?: string; message?: string };
          throw new Error(body.message ?? body.error ?? 'Request failed');
        }
        if (retryRes.status === 204) return undefined as T;
        return retryRes.json();
      }
      clearAuth();
      throw new Error('unauthorized');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      const body = err as { error?: string; message?: string };
      const msg = body.message ?? body.error ?? 'Request failed';
      throw new Error(msg);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  } catch (e) {
    if (isNetworkError(e)) dispatchNetworkError();
    throw e;
  }
}

export const api = {
  health: () => request<{ ok: boolean; db: string }>('/health'),

  /** 공개 사이트 콘텐츠 (마이페이지 약관/개인정보 조회) */
  site: {
    terms: () =>
      request<{ content: string; updatedAt: string | null }>('/site/terms'),
    privacy: () =>
      request<{ content: string; updatedAt: string | null }>('/site/privacy'),
  },

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
    /** 주문 생성. pushSubscription 있으면 저장 후 접수 푸시 발송. */
    createOrder: (body: {
      totalPrice: number;
      items: { productId: string; quantity: number; optionIds: string[] }[];
      orderType?: 'DINE_IN' | 'TAKE_OUT';
      paymentMethod?: 'CARD' | 'CASH' | 'MOBILE' | 'ETC' | 'TOSS';
      usePoint?: number;
      pushSubscription?: { endpoint: string; keys: { p256dh: string; auth: string } };
    }) =>
      request<{ orderNumber: number; orderNo: string; orderId: string; pointsEarned?: number }>('/orders', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    /** 주문 알림 구독 등록 (주문 완료 페이지에서 호출, 접수 푸시 1회 발송) */
    registerPushSubscription: (orderId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
      request<void>(`/orders/${orderId}/push-subscription`, {
        method: 'POST',
        body: JSON.stringify({ subscription }),
      }),
  },

  payments: {
    /** 토스 결제 승인 (성공 URL에서 호출) */
    confirm: (body: { paymentKey: string; orderId: string; amount: number }) =>
      request<{ orderNo: string; orderId?: string; pointsEarned?: number }>('/payments/confirm', {
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
    getOrder: (id: string) => request<UserOrderItem>(`/user/orders/${id}`),
    /** 본인 주문 취소 (접수대기 상태일 때만 가능). 토스 결제 시 토스 취소 API 호출 후 포인트 회수 */
    cancelOrder: (id: string) =>
      request<UserOrderItem>(`/user/orders/${id}/cancel`, { method: 'POST' }),
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
    users: {
      list: () => request<AdminUserListItem[]>('/admin/users'),
      delete: (id: string) => request<void>(`/admin/users/${id}`, { method: 'DELETE' }),
      getOrders: (userId: string) => request<AdminOrderListItem[]>(`/admin/users/${userId}/orders`),
    },
    orders: {
      list: (params?: { status?: string; from?: string; to?: string }) =>
        request<AdminOrderListItem[]>(
          '/admin/orders',
          params && Object.keys(params).length > 0
            ? { params: Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== '')) as Record<string, string> }
            : undefined
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
    terms: {
      get: () =>
        request<{ content: string; updatedAt: string | null }>('/admin/terms'),
      update: (content: string) =>
        request<{ content: string; updatedAt: string }>('/admin/terms', {
          method: 'PUT',
          body: JSON.stringify({ content }),
        }),
    },
    privacy: {
      get: () =>
        request<{ content: string; updatedAt: string | null }>('/admin/privacy'),
      update: (content: string) =>
        request<{ content: string; updatedAt: string }>('/admin/privacy', {
          method: 'PUT',
          body: JSON.stringify({ content }),
        }),
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
  calories: string | null;
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

/** GET /api/user/orders 응답 항목 (해당 로그인 유저 주문만). 완료/취소 24h 지나면 푸시 알림만 삭제, 상세 조회는 계속 가능 */
export type UserOrderItem = {
  id: string;
  orderNo: string;
  orderNumber: number | null;
  status: string;
  orderType: 'DINE_IN' | 'TAKE_OUT';
  totalAmount: number;
  createdAt: string;
  updatedAt?: string;
  items: { id: string; productName: string; imageUrl?: string; quantity: number; lineTotalAmount: number; optionNames?: string[] }[];
};

/** GET /api/admin/users 응답 항목 */
export type AdminUserListItem = {
  id: string;
  memberNo: string;
  name: string;
  username: string;
  email: string;
  orderCount: number;
  createdAt: string;
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
