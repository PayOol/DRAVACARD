import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import Link from "next/link";

type Highlight = {
  label: string;
  value: string;
};

type Section = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

type Faq = {
  question: string;
  answer: string;
};

type RelatedLink = {
  href: string;
  label: string;
};

export default function SeoLandingPage({
  path,
  eyebrow,
  title,
  lead,
  highlights,
  sections,
  faq,
  ctaHref,
  ctaLabel,
  relatedLinks,
}: {
  path: string;
  eyebrow: string;
  title: string;
  lead: string;
  highlights: Highlight[];
  sections: Section[];
  faq: Faq[];
  ctaHref: string;
  ctaLabel: string;
  relatedLinks: RelatedLink[];
}) {
  const canonicalUrl = new URL(path, "https://drava.click").href;
  const structuredData = JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      url: canonicalUrl,
      description: lead,
      inLanguage: "fr-CM",
      isPartOf: {
        "@type": "WebSite",
        name: "DRAVA",
        url: "https://drava.click/",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "DRAVA",
          item: "https://drava.click/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: title,
          item: canonicalUrl,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ]).replace(/</g, "\\u003c");

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white pt-16 text-slate-900 md:pt-20 dark:bg-[#0b1220] dark:text-slate-100">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredData }}
        />

        <section className="border-b border-slate-200 bg-gradient-to-b from-blue-50 to-white px-4 py-12 md:py-20 dark:border-slate-800 dark:from-[#111c2e] dark:to-[#0b1220]">
          <div className="mx-auto max-w-5xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
              {eyebrow}
            </p>
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">
              {title}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl dark:text-slate-300">
              {lead}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={ctaHref}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                {ctaLabel}
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 transition hover:border-blue-400 hover:text-blue-700 dark:border-slate-700 dark:bg-[#111c2e] dark:text-slate-100 dark:hover:border-blue-500"
              >
                Voir tout le catalogue DRAVA
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-10">
          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((item) => (
              <div
                key={`${item.label}-${item.value}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-[#111c2e]"
              >
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {item.label}
                </p>
                <p className="mt-1 text-xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-4 pb-16">
          <div className="space-y-10">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                  {section.title}
                </h2>
                {section.paragraphs?.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-4 max-w-4xl text-base leading-7 text-slate-600 dark:text-slate-300"
                  >
                    {paragraph}
                  </p>
                ))}
                {section.items && (
                  <ul className="mt-5 grid gap-3 md:grid-cols-2">
                    {section.items.map((item) => (
                      <li
                        key={item}
                        className="rounded-xl border border-slate-200 bg-white p-4 leading-6 text-slate-700 dark:border-slate-700 dark:bg-[#111c2e] dark:text-slate-200"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <section className="mt-14">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Questions fréquentes
            </h2>
            <div className="mt-5 space-y-4">
              {faq.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-[#111c2e]"
                >
                  <summary className="cursor-pointer font-semibold marker:text-blue-600">
                    {item.question}
                  </summary>
                  <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>

          <nav
            aria-label="Guides associés"
            className="mt-14 rounded-2xl border border-blue-100 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-950/30"
          >
            <h2 className="text-xl font-bold">Guides DRAVA associés</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:border-blue-400 dark:border-blue-800 dark:bg-[#111c2e] dark:text-blue-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </main>
      <Footer />
    </>
  );
}
