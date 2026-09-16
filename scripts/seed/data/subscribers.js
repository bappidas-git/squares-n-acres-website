/**
 * `newsletterSubscribers` — twelve fictional addresses (§6.14).
 *
 * All on `@example.com`, which cannot receive mail, so a misconfigured
 * campaign run against the seed sends nothing anywhere. Two are unsubscribed,
 * because the admin list has to show both states and because the dedupe rule
 * on `POST /newsletter/subscribe` behaves differently for each.
 */

/**
 * `name, source, daysAgo` and optionally an explicit address.
 *
 * `subscriber.one@example.com` is a **reserved** address: `scripts/smoke-api.js`
 * posts it to `POST /newsletter/subscribe` to exercise the duplicate answer,
 * so the seed has to contain it.
 */
const NAMES = [
  ['Sample Subscriber One', 'newsletter', 82, 'subscriber.one@example.com'],
  ['Divya Raghavan', 'newsletter', 74],
  ['Karthik Prasad', 'article', 66],
  ['Sneha Balakrishnan', 'newsletter', 58],
  ['Imran Qureshi', 'locality-page', 51],
  ['Lakshmi Narayan', 'newsletter', 44],
  ['Vikram Shetty', 'article', 37],
  ['Pooja Agarwal', 'newsletter', 30],
  ['Rahul Dsouza', 'developer-page', 24],
  ['Nandini Gowda', 'newsletter', 17],
  ['Suresh Kamath', 'real-estate-awareness', 11],
  ['Tanvi Bhattacharya', 'newsletter', 5],
];

module.exports = function subscribers({ dates }) {
  return NAMES.map(([name, source, daysAgo, address], index) => {
    const handle = name.toLowerCase().replace(/[^a-z]+/g, '.');
    return {
      id: index + 1,
      email: address ?? `${handle}@example.com`,
      name,
      source,
      // Two people have opted out; the list has to render both states.
      status: index === 4 || index === 8 ? 'unsubscribed' : 'subscribed',
      createdAt: dates.daysAgo(daysAgo, 10, 20),
      updatedAt: dates.daysAgo(
        index === 4 || index === 8 ? Math.max(1, daysAgo - 9) : daysAgo,
        10,
        20
      ),
    };
  });
};
