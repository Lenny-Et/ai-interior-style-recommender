// API Client Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiError {
  error: string;
  message?: string;
  status?: number;
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private getAuthHeaders(): Record<string, string> {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        return {
          'Authorization': `Bearer ${token}`,
        };
      }
    }
    return {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const isFormData = options.body instanceof FormData;
    const headers = {
      ...(isFormData ? {} : this.defaultHeaders),
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Attempt to parse JSON when possible; fall back to text for empty/non-JSON bodies
      const contentType = response.headers.get('content-type') || '';
      let data: any = null;

      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (parseErr) {
          // Malformed JSON
          data = { message: 'Invalid JSON response' };
        }
      } else {
        const text = await response.text();
        data = text ? { message: text } : {};
      }

      if (!response.ok) {
        const apiErr: ApiError = {
          error: (data && (data.error || data.message)) || response.statusText || 'Request failed',
          message: data && data.message,
          status: response.status,
        };
        throw apiErr;
      }

      return data;
    } catch (error) {
      // Normalize thrown errors so callers always receive an object with `error` and optional `status`
      const raw = (error && typeof error === 'object') ? error : { error: String(error) };
      const normalized: ApiError = {
        error: (raw as any).error || (raw as any).message || (Object.keys(raw).length ? JSON.stringify(raw) : 'Unknown error'),
        message: (raw as any).message,
        status: (raw as any).status
      };
      console.error('API request failed:', normalized, '; raw error:', raw);
      throw normalized;
    }
  }

  // Authentication endpoints
  async login(email: string, password: string) {
    return this.request<{ token: string; role: string; is_verified: boolean }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: {
    email: string;
    password: string;
    role: string;
    profile?: any;
  }) {
    return this.request<{ userId: string; message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async forgotPassword(email: string) {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  // Get current authenticated user's profile
  async getCurrentProfile() {
    return this.request('/profiles/me/current');
  }

  // Profile endpoints
  async getProfile(userId: string) {
    return this.request('/profiles/' + userId);
  }

  async updateProfile(userId: string, profileData: any) {
    return this.request('/profiles/' + userId, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async uploadProfilePicture(userId: string, file: File) {
    const formData = new FormData();
    formData.append('image', file);

    return this.request<{ profilePicture: string }>('/profiles/' + userId + '/profile-picture', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  // Generic File Upload
  async uploadFiles(formData: FormData) {
    return this.request<{ files: any[]; message: string }>('/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  // Social endpoints
  async followDesigner(designerId: string) {
    return this.request<{ message: string }>('/social/follow/' + designerId, {
      method: 'POST',
    });
  }

  async unfollowDesigner(designerId: string) {
    return this.request<{ message: string }>('/social/follow/' + designerId, {
      method: 'DELETE',
    });
  }

  async likeContent(targetType: string, targetId: string) {
    return this.request<{ message: string }>(`/social/like/${targetType}/${targetId}`, {
      method: 'POST',
    });
  }

  async unlikeContent(targetType: string, targetId: string) {
    return this.request<{ message: string }>(`/social/like/${targetType}/${targetId}`, {
      method: 'DELETE',
    });
  }

  async saveContent(targetType: string, targetId: string) {
    return this.request<{ message: string }>(`/social/save/${targetType}/${targetId}`, {
      method: 'POST',
    });
  }

  async unsaveContent(targetType: string, targetId: string) {
    return this.request<{ message: string }>(`/social/save/${targetType}/${targetId}`, {
      method: 'DELETE',
    });
  }

  // Feed endpoints
  async getFeed(page = 1, limit = 20) {
    return this.request('/feed?page=' + page + '&limit=' + limit);
  }

  async getTrending(timeRange = '7d') {
    return this.request('/feed/trending?timeRange=' + timeRange);
  }

  async getRecommendations(limit = 10) {
    return this.request('/feed/recommendations?limit=' + limit);
  }

  // Search endpoints
  async searchDesigns(params: {
    q?: string;
    style?: string;
    roomType?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request('/search/designs?' + queryString);
  }

  async searchDesigners(params: {
    q?: string;
    specialty?: string;
    verified?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request('/search/designers?' + queryString);
  }

  // AI endpoints
  async getAIRecommendations(data: {
    imageUrl: string;
    roomType: string;
    styles: string[];
    budget: string;
    creativity: string;
    userId?: string;
  }) {
    return this.request('/ai/recommend', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSavedAIRecommendations(userId: string, page = 1, limit = 10) {
    return this.request(`/ai/saved?userId=${userId}&page=${page}&limit=${limit}`);
  }

  async getSavedAIRecommendation(sessionId: string, userId: string) {
    return this.request(`/ai/saved/${sessionId}?userId=${userId}`);
  }

  async modifyAIRecommendation(recommendationId: string, modifications: any) {
    return this.request('/ai/modify', {
      method: 'POST',
      body: JSON.stringify({ recommendationId, modifications }),
    });
  }

  // Styleboard AI Analysis Methods
  async analyzeStyleBoard(boardId: string) {
    return this.request('/ai/analyze-board', {
      method: 'POST',
      body: JSON.stringify({ boardId }),
    });
  }

  async getBoardAIRecommendations(data: {
    boardId: string;
    preferences: any;
    count: number;
  }) {
    return this.request('/ai/board-recommendations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUserStylePreferences() {
    return this.request('/ai/user-preferences');
  }

  async updateStylePreferences(preferences: any) {
    return this.request('/ai/update-preferences', {
      method: 'POST',
      body: JSON.stringify(preferences),
    });
  }

  async releaseFundsManually(txRef: string) {
    return this.request('/payment/release-funds', {
      method: 'POST',
      body: JSON.stringify({ tx_ref: txRef }),
    });
  }

  async analyzeImageStyle(imageUrl: string) {
    return this.request('/ai/analyze-style', {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
    });
  }

  // Notification endpoints
  async getNotifications(page = 1, limit = 20) {
    return this.request('/notifications?page=' + page + '&limit=' + limit);
  }

  async markNotificationRead(notificationId: string) {
    return this.request('/notifications/' + notificationId + '/read', {
      method: 'PUT',
    });
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/mark-all-read', {
      method: 'PUT',
    });
  }

  // Support endpoints
  async createSupportTicket(data: {
    subject: string;
    description: string;
    category: string;
    priority?: string;
  }) {
    return this.request<{ ticket: any; message: string }>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSupportTickets(page = 1, limit = 20) {
    return this.request('/support/tickets?page=' + page + '&limit=' + limit);
  }

  async getFAQs(category?: string) {
    const query = category ? '?category=' + category : '';
    return this.request('/support/faq' + query);
  }

  // Boards endpoints
  async getBoards(page = 1, limit = 20) {
    return this.request('/boards?page=' + page + '&limit=' + limit);
  }

  async createBoard(data: {
    name: string;
    description?: string;
    tags?: string[];
    isPublic?: boolean;
    coverImage?: string;
  }) {
    return this.request<{ board: any }>('/boards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBoard(boardId: string, data: {
    name?: string;
    description?: string;
    tags?: string[];
    isPublic?: boolean;
    coverImage?: string;
  }) {
    return this.request<{ board: any }>(`/boards/${boardId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBoard(boardId: string) {
    return this.request<{ message: string }>(`/boards/${boardId}`, {
      method: 'DELETE',
    });
  }

  async getBoardItems(boardId: string, page = 1, limit = 20) {
    return this.request(`/boards/${boardId}/items?page=${page}&limit=${limit}`);
  }

  async addItemToBoard(boardId: string, targetType: string, targetId: string) {
    return this.request<{ message: string }>(`/boards/${boardId}/items`, {
      method: 'POST',
      body: JSON.stringify({ targetType, targetId }),
    });
  }

  async removeItemFromBoard(boardId: string, itemId: string) {
    return this.request<{ message: string }>(`/boards/${boardId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  // Custom Requests endpoints
  async getCustomRequests(page = 1, limit = 20, status?: string) {
    const query = status ? `?page=${page}&limit=${limit}&status=${status}` : `?page=${page}&limit=${limit}`;
    return this.request('/custom-requests' + query);
  }

  async getCustomRequest(requestId: string) {
    return this.request(`/custom-requests/${requestId}`);
  }

  async createCustomRequest(data: {
    title: string;
    description: string;
    roomType: string;
    budget: number;
    urgency?: string;
    attachments?: any[];
    timeline?: any;
    tags?: string[];
  }) {
    return this.request<{ customRequest: any }>('/custom-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomRequestStatus(requestId: string, status: string) {
    return this.request<{ request: any }>(`/custom-requests/${requestId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async addCustomRequestMessage(requestId: string, message: string, attachments?: any[]) {
    return this.request<{ message: any }>(`/custom-requests/${requestId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message, attachments }),
    });
  }

  async assignDesignerToRequest(requestId: string, designerId: string) {
    return this.request<{ request: any }>(`/custom-requests/${requestId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ designerId }),
    });
  }

  async applyToRequest(requestId: string, note?: string) {
    return this.request<{ message: string; applicantCount: number }>(`/custom-requests/${requestId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ note }),
    });
  }

  async getRequestApplicants(requestId: string) {
    return this.request<{ applicants: any[] }>(`/custom-requests/${requestId}/applicants`);
  }

  async getAvailableCustomRequests(page = 1, limit = 20) {
    return this.request(`/custom-requests/available/all?page=${page}&limit=${limit}`);
  }

  async checkChatPremiumStatus() {
    return this.request('/custom-requests/chat/premium-status');
  }

  async getDesigners(params?: {
    q?: string;
    specialty?: string;
    verified?: boolean;
    minProjects?: number;
    maxProjects?: number;
    sortBy?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return this.request(`/search/designers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  }

  async getDesigner(id: string) {
    return this.request(`/search/designers/${id}`);
  }

  // Payments endpoints
  async getTransactions(page = 1, limit = 20) {
    return this.request('/payment/transactions?page=' + page + '&limit=' + limit);
  }

  async initializePayment(data: {
    amount: number;
    email: string;
    firstName: string;
    lastName: string;
    homeownerId: string;
    designerId: string;
    sessionId?: string;
  }) {
    return this.request<{ checkoutUrl: string; tx_ref: string }>('/payment/initialize', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyPayment(tx_ref: string, sessionId?: string) {
    return this.request<{ success: boolean; status: string; transaction: any }>('/payment/verify', {
      method: 'POST',
      body: JSON.stringify({ tx_ref, ...(sessionId ? { sessionId } : {}) }),
    });
  }

  async completeProject(tx_ref: string) {
    return this.request<{ message: string; transaction: any }>('/payment/complete-project', {
      method: 'POST',
      body: JSON.stringify({ tx_ref }),
    });
  }

  // Premium access control
  async checkPremiumAccess(purchaseType: string, itemId: string) {
    return this.request<{ hasAccess: boolean; expiresAt?: string; purchaseId?: string }>(`/payment/check-access/${purchaseType}/${itemId}`);
  }

  async getMyPurchases(purchaseType?: string) {
    const query = purchaseType ? `?purchaseType=${purchaseType}` : '';
    return this.request(`/payment/my-purchases${query}`);
  }

  async getPremiumPurchases(userId: string, purchaseType?: string) {
    const query = purchaseType ? `?userId=${userId}&purchaseType=${purchaseType}` : `?userId=${userId}`;
    return this.request(`/payment/premium/purchases${query}`);
  }

  // Designer Analytics endpoints
  async getDesignerAnalytics(timeRange = '30d') {
    return this.request(`/designer/analytics/overview?timeRange=${timeRange}`);
  }

  async getDesignerEarnings(timeRange = '30d') {
    return this.request(`/designer/analytics/earnings?timeRange=${timeRange}`);
  }

  // Admin Analytics endpoints
  async getAdminAnalytics(timeRange = '30d') {
    return this.request(`/admin/analytics/overview?timeRange=${timeRange}`);
  }

  async getAdminUsers(page = 1, limit = 20, role?: string, search?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(role && { role }),
      ...(search && { search })
    });
    return this.request(`/admin/analytics/users?${params}`);
  }

  async updateUserStatus(userId: string, status: string) {
    return this.request(`/admin/analytics/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Admin Transactions endpoints
  async getAdminTransactions(params?: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/admin/analytics/transactions${queryString ? `?${queryString}` : ''}`);
  }

  async getAdminRevenueAnalytics(timeRange = '7m') {
    return this.request(`/admin/analytics/revenue-analytics?timeRange=${timeRange}`);
  }

  // User Designs endpoints
  async getUserDesigns(params?: {
    page?: number;
    limit?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
    favoritesOnly?: boolean;
    userId?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/user-designs${queryString ? '?' + queryString : ''}`);
  }

  // Admin Moderation endpoints
  async getPendingContent(params?: {
    page?: number;
    limit?: number;
    type?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/admin/content/pending${queryString ? '?' + queryString : ''}`);
  }

  async approveContent(type: string, id: string) {
    return this.request(`/admin/content/${type}/${id}/approve`, {
      method: 'POST',
    });
  }

  async removeContent(type: string, id: string, reason?: string) {
    return this.request(`/admin/content/${type}/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  }

  async rejectContent(type: string, id: string, reason?: string) {
    return this.request(`/admin/content/${type}/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async requestEditContent(type: string, id: string, note?: string) {
    return this.request(`/admin/content/${type}/${id}/request-edit`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  }

  async getUserDesign(designId: string) {
    return this.request(`/user-designs/${designId}`);
  }

  async updateDesignInteractions(designId: string, interactions: {
    isFavorite?: boolean;
    isShared?: boolean;
    notes?: string;
  }) {
    return this.request(`/user-designs/${designId}/interactions`, {
      method: 'PATCH',
      body: JSON.stringify(interactions)
    });
  }

  async updateDesignStatus(designId: string, status: {
    status: 'active' | 'archived' | 'hidden';
  }) {
    return this.request(`/user-designs/${designId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(status)
    });
  }

  async getUserDesignStats() {
    return this.request('/user-designs/stats/overview');
  }

  // Portfolio endpoints
  async getPortfolioItems(designerId: string, page = 1, limit = 20, filters?: {
    style?: string;
    roomType?: string;
    status?: string;
  }) {
    const params = new URLSearchParams({
      designerId,
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.style && { style: filters.style }),
      ...(filters?.roomType && { roomType: filters.roomType }),
      ...(filters?.status && { status: filters.status }),
    });
    return this.request(`/portfolio?${params}`);
  }

  async getPortfolioItem(itemId: string) {
    return this.request(`/portfolio/${itemId}`);
  }

  async uploadPortfolioItem(data: {
    designerId: string;
    title?: string;
    description?: string;
    style: string;
    colors?: string;
    roomType: string;
  }, file: File) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('designerId', data.designerId);
    if (data.title) formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    formData.append('style', data.style);
    if (data.colors) formData.append('colors', data.colors);
    formData.append('roomType', data.roomType);

    return this.request<{ item: any }>('/portfolio/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async updatePortfolioItem(itemId: string, data: {
    description?: string;
    metadata?: {
      style?: string;
      colorPalette?: string[];
      roomType?: string;
      title?: string;
      views?: number;
    };
  }) {
    return this.request<{ item: any }>(`/portfolio/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async togglePortfolioFeatured(itemId: string, featured: boolean) {
    return this.request<{ item: any }>(`/portfolio/${itemId}/featured`, {
      method: 'PATCH',
      body: JSON.stringify({ featured }),
    });
  }

  async deletePortfolioItem(itemId: string) {
    return this.request(`/portfolio/${itemId}`, {
      method: 'DELETE',
    });
  }
}

// Create singleton instance
export const apiClient = new ApiClient();
