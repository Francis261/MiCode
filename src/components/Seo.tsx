import { Helmet } from 'react-helmet-async';

interface SeoProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
}

export function Seo({
  title,
  description,
  keywords,
  canonicalUrl,
}: SeoProps) {
  const defaultTitle = "DevGorge - Premium Digital Products & Custom Development";
  const defaultDescription = "Get premium website templates, APIs, developer tools, and custom development services. Launch your next project faster with DevGorge.";
  const defaultKeywords = "website templates, web development, API services, digital products, custom websites, React templates, Next.js, developer tools";
  const baseUrl = "https://devgorge.com"; // Your base URL

  const pageTitle = title ? `${title} | DevGorge` : defaultTitle;
  const pageDescription = description || defaultDescription;
  const pageKeywords = keywords || defaultKeywords;
  const pageCanonicalUrl = canonicalUrl || window.location.href;

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={pageKeywords} />
      <link rel="canonical" href={pageCanonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={pageCanonicalUrl} />
      <meta property="og:image" content={`${baseUrl}/assets/devgorge-logo.png`} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={`${baseUrl}/assets/devgorge-logo.png`} />
    </Helmet>
  );
}