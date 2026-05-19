const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface FetchOptions extends RequestInit {
  token?: string;
}

interface ApiError {
  message: string;
  statusCode: number;
}

/**
 * Client API centralisé pour communiquer avec le backend NestJS.
 */
async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders as Record<string, string>,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...rest,
    headers,
  });

  if (!res.ok) {
    const error: ApiError = await res.json().catch(() => ({
      message: 'Erreur réseau',
      statusCode: res.status,
    }));
    throw new Error(error.message || `Erreur ${res.status}`);
  }

  // Handle empty responses (204 No Content)
  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

// ── Auth endpoints ──────────────────────────────
export const authApi = {
  login: (identifier: string, password: string) =>
    fetchApi<{ user: any; accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),

  register: (data: any) =>
    fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  refresh: (refreshToken: string, token: string) =>
    fetchApi<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      token,
    }),

  logout: (token: string) =>
    fetchApi('/auth/logout', {
      method: 'POST',
      token,
    }),
};

// ── Users endpoints ─────────────────────────────
export const usersApi = {
  getAll: (token: string, params?: string) =>
    fetchApi<{ data: any[]; meta: any }>(`/users${params ? `?${params}` : ''}`, { token }),

  getOne: (id: string, token: string) =>
    fetchApi<any>(`/users/${id}`, { token }),

  update: (id: string, data: any, token: string) =>
    fetchApi<any>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    }),

  delete: (id: string, token: string) =>
    fetchApi(`/users/${id}`, { method: 'DELETE', token }),

  countByRole: (token: string) =>
    fetchApi<any[]>('/users/stats/count', { token }),
};

// ── Entities endpoints ──────────────────────────
export const entitiesApi = {
  getAll: (token: string, params?: string) =>
    fetchApi<{ data: any[]; meta: any }>(`/entities${params ? `?${params}` : ''}`, { token }),

  getOne: (id: string, token: string) =>
    fetchApi<any>(`/entities/${id}`, { token }),

  create: (data: any, token: string) =>
    fetchApi<any>('/entities', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  update: (id: string, data: any, token: string) =>
    fetchApi<any>(`/entities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    }),

  delete: (id: string, token: string) =>
    fetchApi(`/entities/${id}`, { method: 'DELETE', token }),

  countActive: (token: string) =>
    fetchApi<number>('/entities/stats/count', { token }),
};

// ── Queues endpoints ────────────────────────────
export const queuesApi = {
  getAll: (token: string, params?: string) =>
    fetchApi<{ data: any[]; meta: any }>(`/queues${params ? `?${params}` : ''}`, { token }),

  getOne: (id: string, token: string) =>
    fetchApi<any>(`/queues/${id}`, { token }),

  create: (data: any, token: string) =>
    fetchApi<any>('/queues', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  update: (id: string, data: any, token: string) =>
    fetchApi<any>(`/queues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    }),

  delete: (id: string, token: string) =>
    fetchApi(`/queues/${id}`, { method: 'DELETE', token }),

  countByStatus: (token: string) =>
    fetchApi<any[]>('/queues/stats/count', { token }),
};

// ── Tickets endpoints ───────────────────────────
export const ticketsApi = {
  getAll: (token: string, params?: string) =>
    fetchApi<{ data: any[]; meta: any }>(`/tickets${params ? `?${params}` : ''}`, { token }),

  getOne: (id: string, token: string) =>
    fetchApi<any>(`/tickets/${id}`, { token }),

  create: (data: any, token: string) =>
    fetchApi<any>('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  findByNumber: (ticketNumber: string) =>
    fetchApi<any>(`/tickets/by-number/${ticketNumber}`),

  findByQr: (qrCode: string) =>
    fetchApi<any>(`/tickets/by-qr/${qrCode}`),

  callNext: (queueId: string, token: string) =>
    fetchApi<any>(`/tickets/call-next/${queueId}`, {
      method: 'POST',
      token,
    }),

  validate: (id: string, data: any, token: string) =>
    fetchApi<any>(`/tickets/${id}/validate`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    }),

  cancel: (id: string) =>
    fetchApi<any>(`/tickets/${id}/cancel`, {
      method: 'PATCH',
    }),

  getStats: (token: string) =>
    fetchApi<any>('/tickets/stats', { token }),

  getByQueue: (queueId: string, token: string) =>
    fetchApi<any[]>(`/tickets/queue/${queueId}`, { token }),

  exportCsv: async (token: string, params?: string) => {
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/tickets/export/csv${params ? `?${params}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Erreur lors de l\'export');
    return res.blob();
  },
};

// ── Wallet endpoints ────────────────────────────
export const walletApi = {
  getStats: (token: string) =>
    fetchApi<any>('/wallet/stats', { token }),

  getBalance: (token: string) =>
    fetchApi<{ balance: number; currency: string }>('/wallet/balance', { token }),

  getTransactions: (token: string, params?: string) =>
    fetchApi<{ data: any[]; meta: any }>(`/wallet/transactions${params ? `?${params}` : ''}`, { token }),

  deposit: (data: any, token: string) =>
    fetchApi<any>('/wallet/deposit', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
};

// ── Payments endpoints ──────────────────────────
export const paymentsApi = {
  initiate: (data: any, token: string) =>
    fetchApi<any>('/payments/initiate', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  getStatus: (id: string, token: string) =>
    fetchApi<any>(`/payments/${id}/status`, { token }),

  getAll: (token: string, params?: string) =>
    fetchApi<{ data: any[]; meta: any }>(`/payments${params ? `?${params}` : ''}`, { token }),

  getStats: (token: string) =>
    fetchApi<any>('/payments/stats/summary', { token }),
};

// ── Reports endpoints ───────────────────────────
export const reportsApi = {
  getDashboard: (token: string) =>
    fetchApi<any>('/reports/dashboard', { token }),

  getHourly: (token: string, date?: string) =>
    fetchApi<any[]>(`/reports/hourly${date ? `?date=${date}` : ''}`, { token }),

  getRevenue: (token: string, period: string = 'week') =>
    fetchApi<any[]>(`/reports/revenue?period=${period}`, { token }),

  exportExcel: async (token: string, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/reports/export/excel?${params}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Erreur export Excel');
    return res.blob();
  },

  exportPDF: async (token: string, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/reports/export/pdf?${params}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Erreur export PDF');
    return res.blob();
  },
};

// ── Audit endpoints ─────────────────────────────
export const auditApi = {
  getAll: (token: string, params?: string) =>
    fetchApi<{ data: any[]; meta: any }>(`/audit${params ? `?${params}` : ''}`, { token }),
};

export default fetchApi;

