# H.O.M Advisory — Real Estate Website

A full-featured real estate advisory platform for **H.O.M Advisory** (Home Office Market), built with React. Includes a public-facing website for property browsing, articles, and lead capture, along with a complete admin dashboard for managing properties, leads, content, and site settings.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 18 (Create React App) |
| **Routing** | React Router v6 (code-split with `React.lazy`) |
| **UI Library** | Material-UI (MUI) v7 |
| **Styling** | MUI theme + CSS Modules + Global CSS variables |
| **HTTP Client** | Axios with interceptors |
| **Animations** | Framer Motion |
| **Icons** | MUI Icons + Iconify (MDI set) |
| **SEO** | React Helmet Async |
| **Backend API** | Laravel (REST) |

---

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

```bash
git clone <repository-url>
cd HOM-Static-Website
npm install
```

### Development

Run the React dev server:

```bash
npm start
```

### Commands

```bash
npm start        # React dev server
npm run build    # Production build
npm test         # Run tests
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and update as needed:

```bash
cp .env.example .env.local
```

| Variable | Default | Description |
|---|---|---|
| `REACT_APP_API_URL` | `https://phplaravel-780646-6246811.cloudwaysapps.com/api` | Laravel API base URL |
| `REACT_APP_SITE_NAME` | `H.O.M Advisory` | Site display name |
| `REACT_APP_GOOGLE_MAPS_KEY` | — | Google Maps API key |

---

## Project Structure

```
src/
├── assets/               # Static assets (images, global CSS)
│   ├── images/
│   └── styles/
│       └── global.css    # CSS variables, reset, utilities
├── components/
│   ├── admin/            # Admin-specific components (ProtectedRoute)
│   ├── common/           # Shared components (PropertyCard, LeadForm, etc.)
│   ├── layout/           # Layout wrappers (Header, Footer, AdminLayout)
│   └── sections/         # Page section components
│       ├── home/         # Homepage sections (Hero, Featured, FAQ, etc.)
│       └── property/     # Property detail sections (Gallery, Amenities, etc.)
├── contexts/             # React Context providers (AdminAuth)
├── hooks/                # Custom hooks (useDebounce, useThrottledScroll)
├── pages/
│   ├── admin/            # Admin dashboard pages (13 pages)
│   └── public/           # Public-facing pages (23 pages)
├── routes/               # Route configuration
│   └── index.js          # All route definitions
├── services/
│   └── api.js            # Axios API client with all service methods
├── App.js                # Root component with providers
├── index.js              # Entry point
└── theme.js              # MUI theme (colors, typography)
```

---

## Key Features

### Public Website
- Property listings with advanced filtering (type, status, price, BHK, location)
- Property detail pages with gallery, floor plans, amenities, nearby places
- Blog/articles section with category filtering
- FAQ section organized by category
- Lead capture forms (contact, property enquiry, sell/let)
- Neighborhood exploration
- Partner/developer showcase
- Fully responsive (mobile bottom nav, hamburger menu)
- SEO metadata via React Helmet
- Scroll animations via Framer Motion

### Admin Dashboard
- JWT-based authentication (login/logout)
- Dashboard with stats overview
- Property CRUD with rich form (specs, amenities, floor plans, SEO)
- Lead management with status pipeline and notes
- Article/blog management
- FAQ management
- SEO settings
- Site settings (contact info, social links, hero text)

---

## Backend API

The frontend connects to a live Laravel API. Update `REACT_APP_API_URL` in `.env.local` to point to your API instance:

```
REACT_APP_API_URL=https://phplaravel-780646-6246811.cloudwaysapps.com/api
```

The frontend sends `Authorization: Bearer <token>` on all admin routes.

---

## API Documentation

See [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) for the complete API specification, including:
- All endpoint definitions with request/response examples
- Database schema (tables, columns, types, indexes)
- ER diagram
- Authentication flow
- Laravel migration notes

---

## Deployment

### Build for Production

```bash
npm run build
```

The output in `build/` is a static site that can be served by any web server (Nginx, Apache, Vercel, Netlify, etc.).

### Notes
- Set `REACT_APP_API_URL` to your production API before building
- The app uses client-side routing — configure your web server to serve `index.html` for all routes
- Nginx example:
  ```nginx
  location / {
    try_files $uri /index.html;
  }
  ```

---

## End-to-End Test Checklist

### Public Website
- [ ] Homepage loads — hero, featured properties, neighborhoods, FAQ, partners sections
- [ ] Property listing page — filters work (type, status, price range, BHK, search)
- [ ] Property detail page — gallery, specs, amenities, floor plans, nearby places, enquiry form
- [ ] Category pages — Pre-launch, Under Construction, Ready to Move, Rent Apartments, Rent Villas
- [ ] Buyer Assistance pages — Home Loan, Legal Assistance, Interior Designing
- [ ] Articles listing and detail pages
- [ ] FAQ page with category tabs
- [ ] Contact, About, Sell/Let, Careers, Partnership pages
- [ ] Lead forms submit successfully (contact form, property enquiry, sell/let)
- [ ] Navigation — desktop header, mobile hamburger menu, bottom nav
- [ ] Scroll animations and transitions
- [ ] 404 page for invalid routes
- [ ] SEO meta tags present on all pages

### Admin Panel
- [ ] Login with valid credentials
- [ ] Dashboard shows stats and recent data
- [ ] Properties — list, add, edit, toggle active, delete
- [ ] Leads — list, view detail, change status, add notes, delete, CSV export
- [ ] Articles — list, add, edit, delete
- [ ] FAQs — list, add, edit, delete
- [ ] SEO settings — view and update
- [ ] Site settings — update contact info, social links
- [ ] Logout clears session

### Responsive / Mobile
- [ ] All pages render correctly on mobile (375px width)
- [ ] Bottom navigation visible and functional on mobile
- [ ] Drawer menus open and close properly
- [ ] Forms are usable on mobile (no overflow, proper spacing)
- [ ] Property cards stack vertically on small screens

### Cross-Browser
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## Screenshots

*Screenshots will be added here.*

---

## License

Private — H.O.M Advisory. All rights reserved.
