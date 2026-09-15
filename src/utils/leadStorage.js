const STORAGE_KEY = 'hom_lead_data';

export const leadStorage = {
  save(userDetails, propertyId, source) {
    const existing = this.get();
    const data = {
      name: userDetails.name || existing?.name || '',
      email: userDetails.email || existing?.email || '',
      phone: userDetails.phone || existing?.phone || '',
      capturedProperties: existing?.capturedProperties || [],
    };
    if (propertyId && !data.capturedProperties.includes(propertyId)) {
      data.capturedProperties.push(propertyId);
    }
    if (source) {
      if (!data.capturedSources) data.capturedSources = existing?.capturedSources || [];
      const entry = { propertyId, source, timestamp: Date.now() };
      data.capturedSources.push(entry);
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  },

  get() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  getUserDetails() {
    const data = this.get();
    if (!data) return null;
    return { name: data.name, email: data.email, phone: data.phone };
  },

  isLeadCapturedForProperty(propertyId) {
    const data = this.get();
    if (!data || !propertyId) return false;
    return data.capturedProperties?.includes(propertyId) || false;
  },

  isLeadCaptured() {
    const data = this.get();
    return !!(data?.name && data?.phone);
  },

  clear() {
    sessionStorage.removeItem(STORAGE_KEY);
  },
};
