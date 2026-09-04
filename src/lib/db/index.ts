import {
  UserProfile,
  Category,
  price_lists,
  Product,
  Customer,
  Quotation,
  CompanySettings,
  product_price_history,
  QuotationFormState,
} from '@/types';
import { EMPTY_SETTINGS } from '../default-settings';
import { toast } from 'sonner';
class CentralApiClient {
  private cache = {
    users: [] as UserProfile[],
    currentUser: null as UserProfile | null,
    categories: [] as Category[],
    priceLists: [] as price_lists[],
    products: [] as Product[],
    customers: [] as Customer[],
    quotations: [] as Quotation[],
    settings: {...EMPTY_SETTINGS} as CompanySettings,
  };

  // --- Auth & Users ---
  async fetchCurrentUser(): Promise<UserProfile | null> {
    try {
      const res = await this.request('/api/auth/me');
      const json = await res.json();
      if (json.success && json.user) {
        this.cache.currentUser = json.user;
        return json.user;
      }
    } catch (e) { throw e; }
    this.cache.currentUser=null;
    return null;
  }

  getCurrentUser(): UserProfile | null {
    return this.cache.currentUser;
  }

  setCurrentUser(user: UserProfile): void { this.cache.currentUser=user; }
  clear(): void { this.cache={users:[],currentUser:null,categories:[],priceLists:[],products:[],customers:[],quotations:[],settings:{...EMPTY_SETTINGS}}; }
  private async request(url:string, init?:RequestInit):Promise<Response> {
    try {
      const res=await fetch(url,{...init,cache:'no-store'});
      if(!res.ok){const j=await res.json();if(res.status===401){this.clear();window.location.assign('/login');}throw new Error(j.error||`Request failed (${res.status})`);}
      return res;
    } catch(e){const error=e instanceof Error?e:new Error('Cannot connect to server');toast.error(error.message);window.dispatchEvent(new CustomEvent('api-error',{detail:error.message}));throw error;}
  }
  async fetchUsers(): Promise<UserProfile[]> {
    try {
      const res = await this.request('/api/users');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        this.cache.users = json.data;
        return json.data;
      }
    } catch (e) { throw e; }
    return this.cache.users;
  }

  getUsers(): UserProfile[] {
    return this.cache.users;
  }

  async createUser(user: Omit<UserProfile, 'id' | 'created_at'> & { password?: string }): Promise<UserProfile> {
    const res = await this.request('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    const json = await res.json();
    if (json.success && json.data) {
      this.cache.users=[...this.cache.users,json.data];
      return json.data;
    }
    throw new Error(json.error || 'Failed to create user');
  }

  async deleteUser(userId: string): Promise<void> {
    await this.request(`/api/users?id=${userId}`, { method: 'DELETE' });
    this.cache.users = this.cache.users.filter((u) => u.id !== userId);
  }

  // --- Categories ---
  async fetchCategories(): Promise<Category[]> {
    try {
      const res = await this.request('/api/categories');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        this.cache.categories = json.data;
        return json.data;
      }
    } catch (e) { throw e; }
    return this.cache.categories;
  }

  getCategories(): Category[] {
    return this.cache.categories;
  }

  async createCategory(category: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
    const res = await this.request('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category),
    });
    const json = await res.json();
    if (json.success && json.data) {
      this.cache.categories=[...this.cache.categories,json.data];
      return json.data;
    }
    throw new Error(json.error || 'Failed to create category');
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const res = await this.request('/api/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    const json = await res.json();
    if (json.success && json.data) {
      const idx = this.cache.categories.findIndex((c) => c.id === id);
      if (idx > -1) this.cache.categories=this.cache.categories.map((item,i)=>i===idx?json.data:item);
      return json.data;
    }
    throw new Error(json.error || 'Failed to update category');
  }

  async deleteCategory(id: string): Promise<void> {
    await this.request(`/api/categories?id=${id}`, { method: 'DELETE' });
    this.cache.categories = this.cache.categories.filter((c) => c.id !== id);
  }

  // --- Price Lists ---
  async fetchPriceLists(): Promise<price_lists[]> {
    try {
      const res = await this.request('/api/price-lists');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        this.cache.priceLists = json.data;
        return json.data;
      }
    } catch (e) { throw e; }
    return this.cache.priceLists;
  }

  getPriceLists(): price_lists[] {
    return this.cache.priceLists;
  }

  async createPriceList(pl: Omit<price_lists, 'id' | 'is_active' | 'created_at'>): Promise<price_lists> {
    const res = await this.request('/api/price-lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pl),
    });
    const json = await res.json();
    if (json.success && json.data) {
      this.cache.priceLists=[...this.cache.priceLists,json.data];
      return json.data;
    }
    throw new Error(json.error || 'Failed to create price list');
  }

  async updatePriceList(id: string, updates: Partial<price_lists>): Promise<price_lists> {
    const res = await this.request('/api/price-lists', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    const json = await res.json();
    if (json.success && json.data) {
      const idx = this.cache.priceLists.findIndex((p) => p.id === id);
      if (idx > -1) this.cache.priceLists=this.cache.priceLists.map((item,i)=>i===idx?json.data:item);
      return json.data;
    }
    throw new Error(json.error || 'Failed to update price list');
  }

  async deletePriceList(id: string): Promise<void> {
    await this.request(`/api/price-lists?id=${id}`, { method: 'DELETE' });
    this.cache.priceLists = this.cache.priceLists.filter((p) => p.id !== id);
  }

  // --- Products & Pricing ---
  async fetchProducts(): Promise<Product[]> {
    try {
      const res = await this.request('/api/products');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        this.cache.products = json.data;
        return json.data;
      }
    } catch (e) { throw e; }
    return this.cache.products;
  }

  getProducts(): Product[] {
    return this.cache.products;
  }

  getProductById(id: string): Product | undefined {
    return this.cache.products.find((p) => p.id === id);
  }

  async createProduct(product: Omit<Product, 'id' | 'is_active' | 'created_at' | 'updated_at'>, prices?: Record<string, number>): Promise<Product> {
    const res = await this.request('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...product, prices }),
    });
    const json = await res.json();
    if (json.success && json.data) {
      await this.fetchProducts();
      return json.data;
    }
    throw new Error(json.error || 'Failed to create product');
  }

  async updateProduct(id: string, updates: Partial<Product>, prices?: Record<string, number>): Promise<Product> {
    const res = await this.request('/api/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates, prices,expected_updated_at:updates.updated_at??this.getProductById(id)?.updated_at }),
    });
    const json = await res.json();
    if (json.success && json.data) {
      await this.fetchProducts();
      return json.data;
    }
    throw new Error(json.error || 'Failed to update product');
  }

  async deleteProduct(id: string): Promise<void> {
    await this.request(`/api/products?id=${id}`, { method: 'DELETE' });
    this.cache.products = this.cache.products.filter((p) => p.id !== id);
  }

  async upsertProductPrice(productId: string, priceListId: string, unitPrice: number, changeReason?: string): Promise<void> {
    await this.request('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert_price',
        productId,
        priceListId,
        unitPrice,
        reason: changeReason,
      }),
    });
    await this.fetchProducts();
  }

  async getProductPriceHistory(productId: string): Promise<product_price_history[]> {
    return (await (await this.request(`/api/products?history=${productId}`)).json()).data;
  }

  searchProducts(query: string, options?: { categoryId?: string; limit?: number }): Product[] {
    const all = this.getProducts().filter(p=>p.is_active);
    const q = query.trim().toLowerCase();

    return all.filter((p) => {
      if (options?.categoryId && options.categoryId !== 'all' && p.category_id !== options.categoryId) {
        return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.model_number || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    });
  }

  // --- Customers ---
  async fetchCustomers(): Promise<Customer[]> {
    try {
      const res = await this.request('/api/customers');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        this.cache.customers = json.data;
        return json.data;
      }
    } catch (e) { throw e; }
    return this.cache.customers;
  }

  getCustomers(): Customer[] {
    return this.cache.customers;
  }

  async createCustomer(customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
    const res = await this.request('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });
    const json = await res.json();
    if (json.success && json.data) {
      this.cache.customers=[json.data,...this.cache.customers];
      return json.data;
    }
    throw new Error(json.error || 'Failed to create customer');
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const res = await this.request('/api/customers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    const json = await res.json();
    if (json.success && json.data) {
      const idx = this.cache.customers.findIndex((c) => c.id === id);
      if (idx > -1) this.cache.customers=this.cache.customers.map((item,i)=>i===idx?json.data:item);
      return json.data;
    }
    throw new Error(json.error || 'Failed to update customer');
  }

  async deleteCustomer(id: string): Promise<void> {
    await this.request(`/api/customers?id=${id}`, { method: 'DELETE' });
    this.cache.customers = this.cache.customers.filter((c) => c.id !== id);
  }

  // --- Company Settings ---
  async fetchCompanySettings(): Promise<CompanySettings> {
    try {
      const res = await this.request('/api/settings');
      const json = await res.json();
      if (json.success && json.data) {
        this.cache.settings = json.data;
        return json.data;
      }
    } catch (e) { throw e; }
    return this.cache.settings;
  }

  getCompanySettings(): CompanySettings {
    return this.cache.settings;
  }

  async saveCompanySettings(settings: CompanySettings): Promise<void> {
    const response = await this.request('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    this.cache.settings = (await response.json()).data;
  }

  // --- Quotations ---
  async fetchQuotations(): Promise<Quotation[]> {
    try {
      const res = await this.request('/api/quotations');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        this.cache.quotations = json.data;
        return json.data;
      }
    } catch (e) { throw e; }
    return this.cache.quotations;
  }

  getQuotations(): Quotation[] {
    return this.cache.quotations;
  }

  getQuotationById(id: string): Quotation | undefined {
    return this.cache.quotations.find((q) => q.id === id);
  }

  async createQuotation(form: QuotationFormState, requestId: string = crypto.randomUUID()): Promise<Quotation> {
    const res = await this.request('/api/quotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({...form,request_id:requestId}),
    });
    const json = await res.json();
    if (json.success && json.data) {
      this.cache.quotations=[json.data,...this.cache.quotations];
      return json.data;
    }
    throw new Error(json.error || 'Failed to create quotation');
  }

  async updateQuotation(id: string, updates: Partial<Quotation>): Promise<Quotation> {
    const res = await this.request('/api/quotations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates, revision:updates.revision??this.getQuotationById(id)?.revision }),
    });
    const json = await res.json();
    if (json.success && json.data) {
      const idx = this.cache.quotations.findIndex((q) => q.id === id);
      if (idx > -1) this.cache.quotations=this.cache.quotations.map((item,i)=>i===idx?json.data:item);
      return json.data;
    }
    throw new Error(json.error || 'Failed to update quotation');
  }

  async duplicateQuotation(sourceId: string): Promise<Quotation> {
    const res = await this.request('/api/quotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'duplicate', sourceId, request_id:crypto.randomUUID() }),
    });
    const json = await res.json();
    if (json.success && json.data) {
      this.cache.quotations=[json.data,...this.cache.quotations];
      return json.data;
    }
    throw new Error(json.error || 'Failed to duplicate quotation');
  }

  async deleteQuotation(id: string): Promise<void> {
    await this.request(`/api/quotations?id=${id}`, { method: 'DELETE' });
    this.cache.quotations = this.cache.quotations.filter((q) => q.id !== id);
  }

  async previewQuotation(form: QuotationFormState): Promise<Quotation> {return (await (await this.request('/api/quotations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,action:'preview'})})).json()).data;}
}
export const db = new CentralApiClient();
