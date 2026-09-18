# Content to be provided by the client

Everything on the site that is **placeholder or invented**, where it is edited,
and what the client has to supply before launch.

Started by prompt 43 (the copy review); **prompt 48 completes it** as part of
the release audit. Nothing listed here is a bug: `00_MASTER_CONTEXT.md` §14 says
each of these must be a clearly labelled placeholder that an editor can change
from the admin panel, and each one is.

**None of it needs a developer.** Every row below is edited in Admin, and the
"Where to change it" column is the screen. The site reads the record live, so a
change is on the public pages as soon as it is saved.

Legend for **Status**: **Required** — the site is legally or practically wrong
without it. **Recommended** — the page works but reads as unfinished.
**Optional** — hidden while empty, so the site is complete without it.

---

## 1. Company facts — Admin → Settings → General

| What                     | Seeded as                                | Status | Notes |
| ------------------------ | ---------------------------------------- | ------ | ----- |
| Office address           | `[Office address to be provided]`, Bengaluru, Karnataka 560001 | **Required** | Printed in the footer, on `/contact` and in the `RealEstateAgent` structured data. The pin defaults to the city centre (12.9716, 77.5946) until a real address is geocoded. |
| RERA registration number | `To be provided`                         | **Required** | Karnataka RERA requires it to be displayed. Shown in the footer; `Settings → General`. |
| GST number               | `To be provided`                         | Recommended | Footer, beside RERA. |
| Contact phone            | `+91 98000 00001`                        | **Required** | A valid-looking but synthetic number (§14). Drives the header Call button, the bottom bar and the `tel:` links. |
| WhatsApp number          | `+91 98000 00000`                        | **Required** | Drives every WhatsApp button and the prefilled message. |
| E-mail                   | `info@squaresnacres.com`                 | **Required** | Confirm the mailbox exists before launch. |
| Alternate phone          | empty                                    | Optional | Hidden while empty. |
| Established year         | empty                                    | Optional | Hidden while empty; never invent one (§14). |
| Working hours            | Mon–Sat 9:30 am – 6:30 pm, Sun by appointment | Recommended | A plausible default, not a fact the client has confirmed. |
| Tagline                  | "Your trusted partner for Bengaluru property" | Recommended | Appears in the `<title>` of the home page. |
| Map embed URL            | empty                                    | Optional | With none, `/contact` draws the pin from the coordinates. |

## 2. Hero and imagery — Admin → Settings → Hero, and Media library

| What                   | Seeded as                                     | Status | Notes |
| ---------------------- | --------------------------------------------- | ------ | ----- |
| Hero headline          | "Find your next home in Bengaluru"            | Recommended | |
| Hero standfirst        | "Verified apartments, villas, plots and commercial spaces — …" | Recommended | |
| Hero background image  | `picsum.photos` seed (desktop and phone)      | **Required** | Placeholder photography. Every seeded photograph on the site is a `picsum.photos` seed and has to be replaced — listings, localities, builders, articles, team, partners, banks. |
| Hero trust badges      | empty                                         | Optional | Hidden while empty. Do not add a claim the client cannot evidence (§14). |
| Hero statistics        | empty                                         | Optional | Deliberately empty so the row stays hidden: an invented "1 200 happy families" is exactly what §14 forbids. |

## 3. Pages an editor writes — Admin → Pages

| Page                     | What is placeholder                                    | Status |
| ------------------------ | ------------------------------------------------------ | ------ |
| `/about` — "Our story"   | `[Placeholder — client to provide]` paragraph          | **Required** |
| `/about` — the four milestones | four `[Placeholder — client to provide]` lines   | Recommended |
| `/about` — "Mission" and "Vision" | `[Placeholder — client to provide]` paragraphs | Recommended |
| `/about` — statistics block | empty on purpose (see §2)                           | Optional |
| `/careers` — benefits    | one `[Placeholder — client to provide]` line (insurance cover) | Recommended |
| `/sell-let` — statistics | empty on purpose                                       | Optional |
| `/buyer-assistance/legal-assistance` — statistics | empty on purpose              | Optional |

## 4. Legal pages — Admin → Pages

| Page              | Seeded as                                  | Status |
| ----------------- | ------------------------------------------ | ------ |
| `/privacy-policy` | `[Client legal text required]` + a short generic paragraph | **Required** |
| `/terms-of-use`   | `[Client legal text required]` + a short generic paragraph | **Required** |
| `/disclaimer`     | `[Client legal text required]` + a short generic paragraph | **Required** |
| Footer disclaimer | "Listings are subject to availability. `[Client legal text]`" | **Required** — Admin → Settings → Navigation & footer |

The seeded text says in as many words that it is a placeholder, so a launch
that forgets it is visibly wrong rather than quietly wrong.

## 5. Invented records — Admin → the screen named

Every one of these is **clearly fictional** and permitted by §14, but none of it
is the client's real business. Each has to be replaced or deleted.

| What                 | Seeded as                                              | Where to change it | Status |
| -------------------- | ------------------------------------------------------ | ------------------ | ------ |
| Team members         | "Team Member 1" … "Team Member 6"                      | Admin → Team | **Required** |
| Testimonials         | eight records, every one flagged `isSample`            | Admin → Testimonials | **Required** — the public site labels a sample as a sample, so shipping them is honest but pointless |
| Partners             | six invented firms (Aurelia Estates, Garden City Bank, …) | Admin → Partners | **Required** |
| Banks                | six invented lenders, rates marked "Indicative; confirm with the bank" | Admin → Master data → Banks | **Required** — a real rate, fee or tenure attributed to a real bank must come from that bank |
| Developers           | invented builders (Aurelia Estates, Nandi Ridge Developers, Cauvery Homes, …) | Admin → Master data → Developers | **Required** |
| Properties           | the whole seeded catalogue — invented projects at real Bengaluru localities | Admin → Properties | **Required** |
| Leads                | synthetic Indian names, `98XXX XXXX1`-style numbers, `@example.com` addresses | Admin → Leads | **Required** — delete before launch |
| Articles             | written for the seed; bylined "Editorial Team"         | Admin → Articles | Recommended — usable as a starting library, but review before publishing |
| Job openings         | invented roles                                         | Admin → Jobs | Recommended |
| Property documents   | every brochure, floor plan and approval points at one public sample PDF | Admin → Properties → Documents | **Required** — replace with the real files, or turn the document sections off |

## 6. Social and integrations — Admin → Settings

| What                    | Seeded as | Status | Notes |
| ----------------------- | --------- | ------ | ----- |
| Social links (6)        | empty     | Optional | Each icon is hidden while its URL is empty. |
| Cloudinary cloud name   | set to the project's demo cloud | Recommended | Settings → Integrations. Uploads need it; without it the media library still accepts a URL. |
| Google Maps key         | empty     | Optional | Without it the contact map is the embed URL or the coordinates. |
| Google Analytics / Tag Manager | empty | Optional | No tag is injected while empty. |
| reCAPTCHA site key      | empty     | Optional | The honeypot and the throttle protect the forms either way; the notice under the newsletter only appears once a key is set. |

## 7. Copy the site says about itself

These are **ours**, not the client's, and they live in `src/config/copy.js` —
a developer changes them, not an editor. Listed here so the client can review
the tone in one place at sign-off.

| Where                 | What it says |
| --------------------- | ------------- |
| The sell-or-let band  | "Looking to sell or let your property?" and the paragraph under it |
| The home-page band headings | "Featured properties", "New launches", "Ready to move", "Homes to rent", … |
| Empty and error states| "No properties match these filters", "We could not load this right now", … |
| The 404 page          | "We couldn't find that page" |
| Lead-form consent     | "By submitting you agree to be contacted by *<site name>*" — the name comes from Settings |
| Lead-form success     | "An advisor will get back to you **as soon as possible**" |

**No response-time promise is made anywhere.** §14 forbids the site inventing
one. If the client wants to promise a callback window, it becomes a settings
field and a prompt of its own — it must not be edited into a component.

## 8. Settings values whose seeded wording is the client's to confirm

| Setting                        | Seeded as          | Note |
| ------------------------------ | ------------------ | ---- |
| Header CTA label               | "Post Requirement" | The data model's own default (§6.13). The site's fallback, used when the setting is empty, is sentence case — "Post requirement". Pick one and set it in Admin → Settings → Navigation & footer. |
| Newsletter heading             | "Property insight, once a month" | Implies a monthly send. Change it, or commit to the cadence. |
| WhatsApp default message       | "Hi Squares N Acres, I am interested in a property." | Prefilled into every WhatsApp click. |
