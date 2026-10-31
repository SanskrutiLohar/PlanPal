import { useEffect } from 'react';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

interface PageMetaOptions {
  title: string;
  description: string;
  canonicalPath: string;
  breadcrumbs?: BreadcrumbItem[];
}

export function usePageMeta({ title, description, canonicalPath, breadcrumbs }: PageMetaOptions) {
  useEffect(() => {
    // Update title
    document.title = title;

    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    // Update OpenGraph title and description
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description);

    let twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', title);

    let twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute('content', description);

    // Canonical
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    const fullCanonical = `${window.location.origin}${canonicalPath}`;
    linkCanonical.setAttribute('href', fullCanonical);

    // JSON-LD for Breadcrumbs
    const existingJsonLd = document.getElementById('page-breadcrumb-jsonld');
    if (existingJsonLd) {
      existingJsonLd.remove();
    }

    if (breadcrumbs && breadcrumbs.length > 0) {
      const script = document.createElement('script');
      script.id = 'page-breadcrumb-jsonld';
      script.type = 'application/ld+json';
      const jsonLdData = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: `${window.location.origin}${crumb.url}`,
        })),
      };
      script.textContent = JSON.stringify(jsonLdData);
      document.head.appendChild(script);
    }

    return () => {
      const script = document.getElementById('page-breadcrumb-jsonld');
      if (script) script.remove();
    };
  }, [title, description, canonicalPath, breadcrumbs]);
}
