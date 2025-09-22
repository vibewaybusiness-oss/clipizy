import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard/',
        '/admin/',
        '/api/',
        '/auth/',
        '/_next/',
        '/static/',
      ],
    },
    sitemap: 'https://vibewave.ai/sitemap.xml',
  }
}
