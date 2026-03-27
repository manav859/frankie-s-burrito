import type { ResponsiveImageAsset } from './lib/media'

export type CtaVariant = 'primary' | 'secondary' | 'light'

export type Cta = {
  label: string
  href: string
  variant?: CtaVariant
}

export type NavigationItem = {
  label: string
  href: string
}

export type FeaturedItem = {
  name: string
  description: string
  price: string
  image: string
  imageAlt?: string
  imageMedia?: ResponsiveImageAsset
  dark?: boolean
  orderUrl?: string
}

export type InfoCard = {
  number?: string
  title: string
  body: string
  dark?: boolean
  source?: string
}

export type SiteContent = {
  announcement: string
  siteName: string
  siteTagline: string
  siteLogo?: string
  siteLogoLight?: string
  siteLogoAlt?: string
  siteLogoMedia?: ResponsiveImageAsset
  siteLogoLightMedia?: ResponsiveImageAsset
  hero: {
    title: string
    backgroundImage: string
    mobileImage: string
    backgroundImageMedia?: ResponsiveImageAsset
    mobileImageMedia?: ResponsiveImageAsset
    primaryCta: Cta
    secondaryCta: Cta
  }
  navigation: NavigationItem[]
  featuredIntro: {
    eyebrow: string
    title: string
    cta: Cta
  }
  featuredItems: FeaturedItem[]
  reasons: {
    eyebrow: string
    title: string
    body: string
    items: InfoCard[]
  }
  menu: {
    eyebrow: string
    title: string
    body: string
    note: string
    image?: string
    imageAlt?: string
    imageMedia?: ResponsiveImageAsset
    categoryFocusTitle?: string
    categoryFocusBody?: string
    itemCtaLabel?: string
    ctas: string[]
    sections: Array<{
      title: string
      image?: string
      items: string[]
    }>
    footerNote: string
    footerCta: Cta
  }
  about: {
    eyebrow: string
    title: string
    paragraphs: string[]
    image: string
    imageMedia?: ResponsiveImageAsset
    facts: Array<{ value: string; label: string }>
  }
  proof: {
    eyebrow: string
    title: string
    body: string
    backgroundImage?: string
    backgroundImageMedia?: ResponsiveImageAsset
    items: InfoCard[]
  }
  location: {
    eyebrow: string
    title: string
    name: string
    address: string
    city?: string
    region?: string
    postalCode?: string
    country?: string
    phone?: string
    hours: string
    ordering: string
    primaryCta: Cta
    secondaryCta: Cta
    mapTitle: string
    mapBody: string
    mapEmbedUrl: string
    cateringText: string
    cateringCta: Cta
  }
  finalCta: {
    eyebrow: string
    title: string
    body: string
    primaryCta: Cta
    secondaryCta: Cta
  }
  footer: {
    navigateHeading?: string
    visitHeading?: string
    orderHeading?: string
    description: string
    visit: string[]
    order: string[]
  }
}

export type SiteSeo = {
  title: string
  description: string
  canonicalUrl: string
  ogImage: string
  keywords: string
  noindex: boolean
  twitterCard: string
  schema: unknown
}

export type SiteIntegration = {
  gaMeasurementId?: string
}

export type SiteBootstrap = {
  content: SiteContent
  seo: SiteSeo
  integration: SiteIntegration
  generatedAt: string
  preview: boolean
}

export type EntrySeo = {
  title: string
  description: string
  canonicalUrl: string
  ogImage: string
  keywords?: string
  noindex: boolean
  twitterCard?: string
  schema?: unknown
}

export type TaxonomyTerm = {
  id: number
  name: string
  slug: string
}

export type EntryAuthor = {
  id?: number
  name: string
  slug: string
}

export type BlogArchiveMeta = {
  id: number
  title: string
  slug: string
  excerpt?: string
  url: string
  permalink: string
  featuredImage?: string
  featuredImageAlt?: string
  featuredImageMedia?: ResponsiveImageAsset
  pageForPostsId: number
  isAssigned: boolean
  showOnFront: string
  seo: EntrySeo
}

export type PostArchiveItem = {
  title: string
  slug: string
  status?: string
  url: string
  permalink: string
  excerpt: string
  featuredImage: string
  featuredImageAlt?: string
  featuredImageMedia?: ResponsiveImageAsset
  publishedAt: string
  modifiedAt?: string
  author?: EntryAuthor
  readingTimeMinutes?: number
  categories: TaxonomyTerm[]
  tags: TaxonomyTerm[]
  seo: EntrySeo
}

export type PostArchiveResponse = {
  archive: BlogArchiveMeta
  items: PostArchiveItem[]
  pagination: {
    page: number
    perPage: number
    totalItems: number
    totalPages: number
  }
  filters: {
    category: string
    tag: string
    search: string
  }
  categories: TaxonomyTerm[]
  tags: TaxonomyTerm[]
}

export type PostEntry = {
  type: 'post'
  title: string
  slug: string
  status?: string
  url: string
  permalink: string
  excerpt: string
  content: string
  featuredImage: string
  featuredImageAlt?: string
  featuredImageMedia?: ResponsiveImageAsset
  publishedAt: string
  modifiedAt?: string
  author?: EntryAuthor
  readingTimeMinutes?: number
  categories: TaxonomyTerm[]
  tags: TaxonomyTerm[]
  seo: EntrySeo
  archive: BlogArchiveMeta
  related: PostArchiveItem[]
}

export type PageArchiveItem = {
  title: string
  slug: string
  featuredImage: string
  featuredImageAlt?: string
  featuredImageMedia?: ResponsiveImageAsset
  modifiedAt?: string
  seo: EntrySeo
}

export type PageArchiveResponse = {
  items: PageArchiveItem[]
}

export type PageEntry = {
  type: 'page'
  title: string
  slug: string
  content: string
  featuredImage: string
  featuredImageAlt?: string
  featuredImageMedia?: ResponsiveImageAsset
  modifiedAt?: string
  seo: EntrySeo
}

export type SettingsPayload = {
  site: SiteContent['hero'] extends never ? never : {
    announcement: string
    siteName: string
    siteTagline: string
    logoUrl?: string
    logoLightUrl?: string
    logoAlt?: string
    logoMedia?: ResponsiveImageAsset
    logoLightMedia?: ResponsiveImageAsset
  }
  hero: SiteContent['hero']
  featured: SiteContent['featuredIntro']
  reasons: SiteContent['reasons']
  menu: Omit<SiteContent['menu'], 'ctas' | 'sections'>
  about: SiteContent['about']
  proof: Omit<SiteContent['proof'], 'items'>
  location: SiteContent['location']
  finalCta: SiteContent['finalCta']
  footer: SiteContent['footer']
  seoDefaults: {
    siteUrl: string
    title: string
    description: string
    keywords: string
    ogImage: string
    sameAs: string[]
    noindex: boolean
  }
  integration: {
    gaMeasurementId?: string
  }
}

export type NavigationPayload = {
  primary: NavigationItem[]
  footer: NavigationItem[]
}
