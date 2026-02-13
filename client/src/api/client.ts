import { AUTH_STORAGE_KEY_ADMIN, AUTH_STORAGE_KEY_KIOSK, type AuthUser } from '../contexts/AuthContext';

const MOBILE_API_URL_KEY = 'kiosk_api_url';

function isCapacitor(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  return !!(w.Capacitor?.isNativePlatform?.());
}

/** 실기기 빌드 시 VITE_API_URL 사용. Capacitor 앱에서는 localStorage(kiosk_api_url) 폴백으로 재빌드 없이 PC IP 변경 가능. */
function getApiBase(): string {
  const url = import.meta.env.VITE_API_URL;
  if (url && typeof url === 'string') {
    const t = url.trim().replace(/\/+$/, '');
    if (t) return t;
  }
  if (isCapacitor()) {
    const stored = localStorage.getItem(MOBILE_API_URL_KEY);
    if (stored && typeof stored === 'string') {
      const t = stored.trim().replace(/\/+$/, '');
      if (t) return t;
    }
  }
  return '';
}

function getApiBaseWithApi(): string {
  const base = getApiBase();
  return base ? `${base}/api` : '/api';
}

/** API 루트 URL (AuthContext 등에서 fetch 시 사용). 요청 시마다 계산해 모바일에서 저장된 URL 반영. */
export function getApiRoot(): string {
  return getApiBaseWithApi();
}

/** 현재 API 베이스(호스트까지). 모바일 연결 설정 UI에서 표시/입력용. */
export function getApiBaseUrl(): string {
  return getApiBase() || (typeof window !== 'undefined' ? window.location.origin : '');
}

/** Capacitor 여부. 연결 설정 UI 노출 여부에 사용. */
export function isCapacitorApp(): boolean {
  return isCapacitor();
}

/** 모바일에서 API 주소 저장 후 앱 재시작 시 반영. (저장만 하며, 호출 측에서 reload 권장) */
export function setMobileApiBaseUrl(url: string): void {
  const t = url.trim().replace(/\/+$/, '');
  if (t) localStorage.setItem(MOBILE_API_URL_KEY, t);
}

type StoredAuth = { accessToken?: string; refreshToken?: string; user?: unknown };

/** 현재 경로가 /admin 이면 관리자용 키, 아니면 유저(키오스크)용 키 사용 → 탭별로 관리자/유저 로그인 분리 */
function getAuthStorageKey(): string {
  if (typeof window === 'undefined') return AUTH_STORAGE_KEY_KIOSK;
  return window.location.pathname.startsWith('/admin') ? AUTH_STORAGE_KEY_ADMIN : AUTH_STORAGE_KEY_KIOSK;
}

function getStored(): StoredAuth | null {
  try {
    const key = getAuthStorageKey();
    const raw = localStorage.getItem(key);
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

/** NetworkErrorContext와 동기화: 동일한 이벤트명 사용 */
export const NETWORK_ERROR_EVENT = 'app:network-error';

function clearAuth(): void {
  const key = getAuthStorageKey();
  localStorage.removeItem(key);
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED));
}

/** 네트워크/타임아웃 등 fetch 실패로 판단할 때 true (배너 노출용) */
export function isNetworkError(e: unknown): boolean {
  if (e instanceof TypeError && e.message === 'Failed to fetch') return true;
  if (e instanceof Error && /network|fetch|offline|timeout|abort/i.test(e.message)) return true;
  return false;
}

/** 상단 네트워크 오류 배너 표시 (NetworkErrorProvider가 구독) */
export function dispatchNetworkError(): void {
  window.dispatchEvent(new CustomEvent(NETWORK_ERROR_EVENT));
}

/** Refresh 토큰으로 Access 재발급 후 저장 (로테이션으로 refreshToken도 갱신됨) */
async function refreshAndSave(): Promise<string | null> {
  const data = getStored();
  const refreshToken = data?.refreshToken;
  if (!refreshToken) return null;
  const apiRoot = getApiBaseWithApi();
  const res = await fetch(`${apiRoot}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { accessToken: string; refreshToken: string };
  if (!body.accessToken || !body.refreshToken) return null;
  const next = { ...data, accessToken: body.accessToken, refreshToken: body.refreshToken };
  localStorage.setItem(getAuthStorageKey(), JSON.stringify(next));
  return body.accessToken;
}

async function request<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string> }
): Promise<T> {
  const { params, ...init } = options ?? {};
  const apiRoot = getApiBaseWithApi();
  const pathNorm = path.startsWith('/') ? path : `/${path}`;
  const url = params
    ? `${apiRoot}${pathNorm}?${new URLSearchParams(params)}`
    : `${apiRoot}${pathNorm}`;
  const urlTrimmed = url.trim();
  const headers: HeadersInit = { 'Content-Type': 'application/json', ...init.headers };
  const token = getAuthToken();
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(urlTrimmed, { ...init, headers });

    if (res.status === 401) {
      const newToken = await refreshAndSave();
      if (newToken) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
        const retryRes = await fetch(urlTrimmed, { ...init, headers });
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
    list: (params?: { updatedAfter?: string }) =>
      request<{ id: string; name: string; sortOrder: number }[]>(
        '/categories',
        params?.updatedAfter ? { params: { updatedAfter: params.updatedAfter } } : undefined
      ),
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
      list: (params?: { status?: string; from?: string; to?: string; updatedAfter?: string }) =>
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
    optionGroups: {
      list: () =>
        request<{ id: string; name: string; sortOrder: number; options: { id: string; name: string; defaultExtraPrice: number; sortOrder: number }[] }[]>(
          '/admin/option-groups'
        ),
      createOption: (groupId: string, body: { name: string; defaultExtraPrice?: number }) =>
        request<{ id: string; name: string; defaultExtraPrice: number }>(`/admin/option-groups/${groupId}/options`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
    },
    products: {
      list: (params?: { updatedAfter?: string }) =>
        request<(MenuItem & { category: { id: string; name: string }; isAvailable?: boolean })[]>(
          '/admin/products',
          params?.updatedAfter ? { params: { updatedAfter: params.updatedAfter } } : undefined
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
      setOptions: (id: string, body: { optionIds: string[] }) =>
        request<void>(`/admin/products/${id}/options`, { method: 'POST', body: JSON.stringify(body) }),
    },
    categories: {
      list: (params?: { updatedAfter?: string }) =>
        request<{ id: string; name: string; sortOrder: number }[]>(
          '/categories',
          params?.updatedAfter ? { params: { updatedAfter: params.updatedAfter } } : undefined
        ),
      getDefaultOptions: (categoryId: string) =>
        request<{ optionIds: string[] }>(`/admin/categories/${categoryId}/default-options`),
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
  ingredients: string | null;
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
  /** PENDING = 결제 미완료(토스 결제 실패 등), PAID = 결제 완료 */
  paymentStatus?: 'PENDING' | 'PAID' | 'REFUNDED';
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
