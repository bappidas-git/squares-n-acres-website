/**
 * The data layer's barrel. One import line gives a screen every service:
 *
 *   import { propertyService, leadService } from '../../services';
 *
 * The services themselves are thin: each function is one call through
 * `http.request()` with an entry of `endpoints.js`, and nothing reshapes a
 * record on the way in or out (§5.1).
 */

export { default as http, buildUrl, setAuthToken, onUnauthorized, clearSession } from './http';
export { default as ApiError, isCanceled } from './apiError';
export { endpoints, allEndpoints, findEndpoint } from './endpoints';

export { default as articleService } from './articleService';
export { default as authService } from './authService';
export { default as careerService } from './careerService';
export { default as dashboardService } from './dashboardService';
export { default as leadService } from './leadService';
export { default as masterDataService } from './masterDataService';
export { default as mediaService } from './mediaService';
export { default as newsletterService } from './newsletterService';
export { default as pageService } from './pageService';
export { default as propertyService } from './propertyService';
export { default as redirectService } from './redirectService';
export { default as seoService } from './seoService';
export { default as settingsService } from './settingsService';
export { default as userService } from './userService';
