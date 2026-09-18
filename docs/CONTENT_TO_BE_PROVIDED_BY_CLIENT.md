# Content to be provided by the client

Everything on the site that is **placeholder or invented**, what it currently
says, where it is changed, and whether it blocks the launch.

Started by prompt 43 (the copy review); **completed by prompt 48** as part of the
release audit. Nothing listed here is a bug: `00_MASTER_CONTEXT.md` §14 requires
each of these to be a clearly labelled placeholder an editor can change from the
admin panel, and each one is.

**Almost none of it needs a developer.** Every row whose "Where to change it"
column names an Admin screen is edited in the browser, and the public site reads
the record live — a change is visible as soon as it is saved. The handful of rows
that need a build (marked _build_) are environment variables baked into the
bundle, and they are called out as such.

**Go-live** is the only column that gates a launch:

- **yes** — the site is legally or practically wrong without it.
- **no** — either the field hides itself while empty, or the seeded value is
  honest enough to ship. The **Notes** column says which.

`docs/RELEASE_CHECKLIST.md` §5 is the sign-off gate that reads this file.

---

## 1. Company facts — Admin → Settings → General and → Contact

| Item | Current placeholder value | Where to change it | Go-live | Notes |
| ---- | ------------------------- | ------------------ | ------- | ----- |
| Office address | `[Office address to be provided]`, Bengaluru, Karnataka 560001 | Admin → Settings → General → Address | **yes** | Printed in the footer, on `/contact` and inside the `RealEstateAgent` structured data. Until a real address is geocoded the map pin stays on the city centre. |
| Map coordinates | 12.9716, 77.5946 (Bengaluru city centre) | Admin → Settings → General → Latitude/Longitude | **yes** | Re-geocode once the address is real, or `/contact` shows a pin in the wrong place with full confidence. |
| RERA registration number | `To be provided` | Admin → Settings → General → RERA number | **yes** | Karnataka RERA requires it to be displayed. Shown in the footer. |
| GST number | `To be provided` | Admin → Settings → General → GST number | no | Footer, beside RERA. Reads as unfinished while it says "To be provided" — set it or clear it. |
| Contact phone | `+91 98000 00001` | Admin → Settings → Contact → Phone | **yes** | Valid-looking but synthetic (§14). Drives the header Call button, the mobile bottom bar and every `tel:` link. |
| WhatsApp number | `+91 98000 00000` | Admin → Settings → Contact → WhatsApp | **yes** | Drives every WhatsApp button and the prefilled message. |
| E-mail | `info@squaresnacres.com` | Admin → Settings → Contact → E-mail | **yes** | Plausible, but confirm the mailbox exists and somebody reads it — it also receives the lead notifications. |
| Lead notification recipients | `info@squaresnacres.com` | Admin → Settings → Lead notifications | **yes** | An enquiry that notifies a mailbox nobody opens is a lost client. |
| Alternate phone | empty | Admin → Settings → Contact | no | Hidden while empty. |
| Established year | empty | Admin → Settings → General | no | Hidden while empty. Never invent one (§14). |
| Working hours | Mon–Sat 9:30 am – 6:30 pm; Sun by appointment | Admin → Settings → Contact → Working hours | no | A plausible default, **not** a fact the client has confirmed. Shown on `/contact`. |
| Tagline | "Your trusted partner for Bengaluru property" | Admin → Settings → General → Tagline | no | Appears in the home page `<title>`. |
| Map embed URL | empty | Admin → Settings → General | no | With none, `/contact` draws the pin from the coordinates above. |
| Site name | `Squares N Acres` | Admin → Settings → General → Site name | no | Confirm the spelling and spacing the client uses in writing — it appears in every page title and in the consent line under every form. |

## 2. Logo, hero and imagery — Admin → Settings → Hero, Admin → Media

| Item | Current placeholder value | Where to change it | Go-live | Notes |
| ---- | ------------------------- | ------------------ | ------- | ----- |
| Logo usage on dark surfaces | the supplied Cloudinary logo, used as-is on the dark footer and dark bands | Admin → Settings → General → Logo | **yes** | The client must **confirm** the single logo is legible and permitted on dark surfaces, or supply a light/inverse variant. §2.2 of the brand rules forbids recolouring it locally. This is a sign-off, not an edit. |
| Favicon / app icon | the supplied Cloudinary icon | Admin → Settings → General → Icon | no | Confirm it reads at 16 px. |
| Hero headline | "Find your next home in Bengaluru" | Admin → Settings → Hero → Title | no | |
| Hero standfirst | "Verified apartments, villas, plots and commercial spaces — with expert guidance at every step." | Admin → Settings → Hero → Subtitle | no | The word "Verified" is a claim. Keep it only if the client stands behind it. |
| Hero background image (desktop) | `picsum.photos` seed `sna-hero-background` | Admin → Settings → Hero → Background image | **yes** | Placeholder photography. |
| Hero background image (phone) | `picsum.photos` seed `sna-hero-mobile` | Admin → Settings → Hero → Mobile image | **yes** | Placeholder photography. |
| Every other photograph on the site | `picsum.photos` seeds | Admin → the record's own screen, or Admin → Media | **yes** | Listings, localities, builders, articles, team, partners, banks and the footer gallery are all placeholder photography. §14 forbids shipping a real listing photo the client does not own, and forbids leaving a stock seed in place as if it were the property. |
| Hero trust badges | empty | Admin → Settings → Hero → Badges | no | Hidden while empty. Do not add a claim the client cannot evidence (§14). |
| Hero statistics | empty | Admin → Settings → Hero → Stats | no | Deliberately empty so the row stays hidden: an invented "1 200 happy families" is exactly what §14 forbids. |

## 3. Pages an editor writes — Admin → Pages

| Item | Current placeholder value | Where to change it | Go-live | Notes |
| ---- | ------------------------- | ------------------ | ------- | ----- |
| `/about` — "Our story" | `[Placeholder — client to provide]` paragraph | Admin → Pages → About → the richText block | **yes** | The marker is visible on the live page, so forgetting it is loud rather than quiet. |
| `/about` — the four milestones | four `[Placeholder — client to provide]` lines | Admin → Pages → About → timeline block | no | Delete the block if the client has no dated history — an invented founding year is forbidden (§14). |
| `/about` — Mission and Vision | `[Placeholder — client to provide]` paragraphs | Admin → Pages → About | no | |
| `/about` — statistics block | empty on purpose | Admin → Pages → About → stats block | no | See §2: hidden while empty. |
| `/careers` — benefits | one `[Placeholder — client to provide]` line (insurance cover) | Admin → Pages → Careers | no | A benefit the client does not offer is a promise to a candidate. |
| `/sell-let` — statistics | empty on purpose | Admin → Pages → Sell or let | no | |
| `/buyer-assistance/legal-assistance` — statistics | empty on purpose | Admin → Pages → Legal assistance | no | |
| Footer "about" paragraph | "Squares N Acres is a property advisory based in Bengaluru…" | Admin → Settings → Navigation & footer | no | Written for the seed. Reads as real, so have the client approve the claims in it ("we list what we have seen", "verify what we publish"). |

## 4. Legal pages — Admin → Pages

| Item | Current placeholder value | Where to change it | Go-live | Notes |
| ---- | ------------------------- | ------------------ | ------- | ----- |
| `/privacy-policy` | `[Client legal text required]` + a short generic paragraph | Admin → Pages → Privacy policy | **yes** | The site collects names, phone numbers and e-mail addresses through its forms; it needs a real policy. |
| `/terms-of-use` | `[Client legal text required]` + a short generic paragraph | Admin → Pages → Terms of use | **yes** | |
| `/disclaimer` | `[Client legal text required]` + a short generic paragraph | Admin → Pages → Disclaimer | **yes** | Covers the listing information and the indicative figures. |
| Footer disclaimer line | "Listings are subject to availability. `[Client legal text]`" | Admin → Settings → Navigation & footer → Disclaimer | **yes** | Shown on every page. |

The seeded text says in as many words that it is a placeholder, so a launch that
forgets it is visibly wrong rather than quietly wrong.

## 5. Invented records — Admin → the screen named

Every one of these is **clearly fictional** and permitted by §14, but none of it
is the client's real business. Each has to be replaced or deleted.

| Item | Current placeholder value | Where to change it | Go-live | Notes |
| ---- | ------------------------- | ------------------ | ------- | ----- |
| Properties | 40 invented projects at real Bengaluru localities | Admin → Properties | **yes** | The whole seeded catalogue. Publish real listings, then delete these. |
| Developers | 8 invented builders (Aurelia Estates, Nandi Ridge Developers, Cauvery Homes, …) | Admin → Master data → Developers | **yes** | §14 forbids naming a real builder without permission, and forbids leaving an invented one live. |
| Banks | 6 invented lenders; every rate marked "Indicative; confirm with the bank" | Admin → Master data → Banks | **yes** | A rate, fee or tenure attributed to a **real** bank must come from that bank in writing. The EMI calculator on `/buyer-assistance/home-loan` reads these records. |
| Partners | 6 invented firms | Admin → Partners | **yes** | |
| Team members | "Team Member 1" … "Team Member 6" | Admin → Team | **yes** | Real names, roles and photographs, or delete the section. |
| Testimonials | 8 records, every one flagged `isSample` | Admin → Testimonials | **yes** | The public site labels a sample as a sample, so shipping them is honest but pointless. Replace with attributed quotes the client has consent to publish. |
| Leads | 45 synthetic records — Indian names, `98XXX XXXX1` numbers, `@example.com` addresses | Admin → Leads | **yes** | Delete before launch, or the CRM opens on fictional work and the dashboard counts it. |
| Articles | 12 written for the seed, bylined "Editorial Team" | Admin → Articles | no | Usable as a starting library — but see §6, the figures in them are not. |
| Job openings | 4 invented roles | Admin → Jobs | no | Applications go to a real inbox, so an invented role wastes a candidate's time. Delete or replace. |
| Job applications | 3 synthetic records | Admin → Jobs → Applications | no | Delete with the leads. |
| Newsletter subscribers | 12 synthetic `@example.com` addresses | Admin → Newsletter | **yes** | Never send to them; delete before the list is connected to anything that sends. |
| FAQs | 20 written for the seed | Admin → FAQs | no | Generic and accurate, but they speak for the client — have them read. |
| Property documents | every brochure, floor plan and approval points at one public sample PDF | Admin → Properties → the property → Documents | **yes** | Replace with the real files, or turn the document sections off. A sample PDF presented as a floor plan is a misrepresentation. |
| Redirects | 3 example rules | Admin → SEO → Redirects | no | Harmless, but they are examples — review before launch. |

## 6. Facts and figures that need a professional to sign them off

| Item | Current placeholder value | Where to change it | Go-live | Notes |
| ---- | ------------------------- | ------------------ | ------- | ----- |
| Stamp duty and registration charges | the rates the seeded articles and the awareness page quote | Admin → Articles, and Admin → Pages → Real-estate awareness | **yes** | **Verify with a CA or a lawyer on the launch date, or remove the figure.** These change by budget cycle, they are the most-quoted numbers on a property site, and the site carries the liability (§14, D84). |
| Home-loan interest rates, fees and tenures | indicative values on the 6 invented banks | Admin → Master data → Banks | **yes** | See §5. The calculator presents them as arithmetic, which reads as authoritative. |
| Tax treatment, capital gains, TDS | whatever the seeded articles state | Admin → Articles | **yes** | Same standard as stamp duty. |
| Locality claims (prices, connectivity, upcoming infrastructure) | written for the seed from public knowledge | Admin → Master data → Localities | no | Re-read before launch; an out-of-date metro line is a credibility problem. |
| Any article's facts and figures | as written for the seed | Admin → Articles → the article | **yes** | Every article was written to fill the library, not by a subject-matter expert. Review before the first is promoted. |

## 7. Integrations and social — Admin → Settings → Integrations, → Navigation & footer

| Item | Current placeholder value | Where to change it | Go-live | Notes |
| ---- | ------------------------- | ------------------ | ------- | ----- |
| Social links (6: Facebook, Instagram, LinkedIn, YouTube, X, Pinterest) | all empty | Admin → Settings → Navigation & footer → Social | no | Each icon is hidden while its URL is empty, so the footer is correct as it stands. |
| Google Analytics 4 measurement ID | empty | Admin → Settings → Integrations | no | No tag is injected while empty. Verify in GA4 Realtime after setting it — an ID that is set but not reporting is worse than none. |
| Google Tag Manager container ID | empty | Admin → Settings → Integrations | no | |
| Meta (Facebook) pixel ID | empty | Admin → Settings → Integrations | no | Only if the client runs Meta ads. It is a third-party tracker — the privacy policy (§4) has to mention it. |
| Google Maps browser key | empty | Admin → Settings → Integrations | no | Without it the contact map falls back to the embed URL, then to the coordinates. Restrict the key to the production referrer before using it. |
| Cloudinary cloud name | empty | Admin → Settings → Integrations | no | Needed for uploads from the media library; without it the library still accepts a pasted URL. (The seeded **logo** URL is served from the brand's own Cloudinary cloud — that is unrelated to this setting.) |
| Cloudinary unsigned upload preset | empty | Admin → Settings → Integrations | no | Required together with the cloud name. Must be an **unsigned** preset, and scoped to a folder. |
| reCAPTCHA site key | empty | Admin → Settings → Integrations | no | **Not wired to a verifier** — deferred past 1.0 (`docs/DECISIONS.md`). The honeypot and the rate limit protect the forms today. Setting a key only shows the notice under the newsletter form; it does not add verification. |

## 8. Environment — a developer, on the build machine (_build_)

These four are not in Admin: they are baked into the JavaScript bundle at build
time, so changing one needs a rebuild and a redeploy. `.env.production.example`
is the template; `docs/RELEASE_CHECKLIST.md` §2 is the procedure.

| Item | Current placeholder value | Where to change it | Go-live | Notes |
| ---- | ------------------------- | ------------------ | ------- | ----- |
| Production domain (`REACT_APP_SITE_URL`) | `https://www.squaresnacres.com` | _build_ — `.env.production` | **yes** | Confirm the client owns this exact host, and that it matches the host Nginx redirects to and `seoSettings.siteUrl`. Every canonical URL, Open Graph tag and sitemap entry is built from it. |
| Production API URL (`REACT_APP_API_URL`) | `https://api.squaresnacres.com/api` | _build_ — `.env.production` | **yes** | The one line the switch-over changes. Must end in `/api`. |
| Site name (`REACT_APP_SITE_NAME`) | `Squares N Acres` | _build_ — `.env.production` | no | Only a fallback: the API's `siteSettings.general.siteName` wins once it answers. |
| `seoSettings.siteUrl` | `https://www.squaresnacres.com` | Admin → SEO → Settings | **yes** | Must equal the canonical host. A mismatch points every canonical tag at the wrong origin. |

## 9. Accounts to rotate before launch

| Item | Current placeholder value | Where to change it | Go-live | Notes |
| ---- | ------------------------- | ------------------ | ------- | ----- |
| Admin account | `admin@squaresnacres.com` / `Admin@123` | Admin → Settings → Users | **yes** | **Rotate the password and rename or deactivate the account.** These three credentials are in this repository, in `db.json` and in the handover package — treat them as public. |
| Manager account | `manager@squaresnacres.com` / `Manager@123` | Admin → Settings → Users | **yes** | As above. |
| Sales account | `sales@squaresnacres.com` / `Sales@123` | Admin → Settings → Users | **yes** | As above. |
| Role assignment for real staff | — | Admin → Settings → Users | **yes** | Give each person the lowest role that lets them work: `sales` for the CRM, `manager` for content, `admin` only for whoever owns users and settings (`docs/RBAC.md`). |

## 10. Settings whose seeded wording the client should confirm

| Item | Current placeholder value | Where to change it | Go-live | Notes |
| ---- | ------------------------- | ------------------ | ------- | ----- |
| Header CTA label | "Post Requirement" | Admin → Settings → Navigation & footer | no | The data model's own default (§6.13). The fallback used when the field is empty is sentence case — "Post requirement". Pick one. |
| Newsletter heading | "Property insight, once a month" | Admin → Settings → Newsletter | no | Implies a monthly send. Change it, or commit to the cadence. |
| Newsletter success message | "Thank you — please check your inbox to confirm the subscription." | Admin → Settings → Newsletter | no | Promises a confirmation e-mail. Make sure one is actually sent. |
| WhatsApp default message | "Hi Squares N Acres, I am interested in a property." | Admin → Settings → General | no | Prefilled into every WhatsApp click. |
| Copyright line | seeded with the site name | Admin → Settings → Navigation & footer | no | Check the legal entity name, which is often not the brand name. |

## 11. Copy the site says about itself — a developer, in code

These are **ours**, not the client's. They live in `src/config/copy.js`, so a
developer changes them, not an editor. Listed here so the client can review the
tone in one place at sign-off. None of them blocks a launch.

| Where | What it says |
| ----- | ------------ |
| The sell-or-let band | "Looking to sell or let your property?" and the paragraph under it |
| The home-page band headings | "Featured properties", "New launches", "Ready to move", "Homes to rent", … |
| Empty and error states | "No properties match these filters", "We could not load this right now", … |
| The 404 page | "We couldn't find that page" |
| Lead-form consent | "By submitting you agree to be contacted by _<site name>_" — the name comes from Settings |
| Lead-form success | "An advisor will get back to you **as soon as possible**" |

**No response-time promise is made anywhere.** §14 forbids the site inventing
one. If the client wants to promise a callback window it becomes a settings
field and a change of its own — it must not be edited into a component.
