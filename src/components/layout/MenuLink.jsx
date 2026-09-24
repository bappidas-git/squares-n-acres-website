import { Link } from 'react-router-dom';

/** A full `http(s)` address: another site, which the router cannot reach. */
export const isExternalHref = (href) => /^https?:\/\//i.test(String(href ?? ''));

/**
 * One link of a navigation menu, the header's or the phone drawer's.
 *
 * A menu used to hold nothing but this site's own pages, so every entry was a
 * router `Link`. An editor can now type a link into a menu (QA-56) — another
 * site, or a page meant to open beside this one — and a router `Link` to an
 * address on another origin is not a link to it. Those two render as a plain
 * anchor; everything else stays a router link, so moving between pages of the
 * site is still a client-side navigation.
 *
 * @param {object} props
 * @param {{to: string, newTab?: boolean}} props.link
 * @param {string} [props.className]
 * @param {() => void} [props.onClick]
 * @param {React.ReactNode} props.children
 */
export default function MenuLink({ link, className, onClick, children }) {
  if (isExternalHref(link.to) || link.newTab) {
    return (
      <a
        href={link.to}
        className={className}
        onClick={onClick}
        {...(link.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    );
  }

  return (
    <Link to={link.to} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
