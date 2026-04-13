import Logo from "@/components/common/logo"
import {
  footerCompany,
  footerLegal,
  footerSocial,
  footerSolutions,
  footerSupport,
  type FooterLinkItem,
} from "@/data/footer.data"
import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"
import { FooterNewsletterForm } from "./footer-newsletter-form"


const linkClass =
  "text-sm leading-6 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"

const headingClass = "text-sm leading-6 font-semibold text-foreground"

function FooterNavLink({
  item,
  label,
}: {
  item: FooterLinkItem
  label: string
}) {
  const isAppPath = item.href.startsWith("/")

  if (isAppPath) {
    return (
      <Link href={item.href} className={linkClass}>
        {label}
      </Link>
    )
  }

  return (
    <a href={item.href} className={linkClass}>
      {label}
    </a>
  )
}

function LinkColumn({
  title,
  items,
  t,
}: {
  title: string
  items: FooterLinkItem[]
  t: Awaited<ReturnType<typeof getTranslations>>
}) {
  return (
    <div>
      <h3 className={headingClass}>{title}</h3>
      <ul role="list" className="mt-6 space-y-4">
        {items.map((item) => (
          <li key={item.messageKey}>
            <FooterNavLink item={item} label={t(item.messageKey)} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default async function SiteFooter() {
  const t = await getTranslations("Footer")
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-8 sm:pt-20 lg:px-8 lg:pt-24">
        <div className="xl:grid xl:grid-cols-2 xl:gap-10">
          <div className="grid grid-cols-2 gap-8 xl:col-span-2">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <LinkColumn
                title={t("columnSolutions")}
                items={footerSolutions}
                t={t}
              />
              <div className="mt-10 md:mt-0">
                <LinkColumn
                  title={t("columnSupport")}
                  items={footerSupport}
                  t={t}
                />
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <LinkColumn
                title={t("columnCompany")}
                items={footerCompany}
                t={t}
              />
              <div className="mt-10 md:mt-0">
                <LinkColumn
                  title={t("columnLegal")}
                  items={footerLegal}
                  t={t}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-8 border-t border-border/80 pt-8 sm:mt-16 md:flex-row md:items-center md:justify-between lg:mt-20">
          <div className="flex flex-wrap gap-x-6 gap-y-2 md:order-2">
            {footerSocial.map(({ ariaKey, href, Icon }) => (
              <a
                key={ariaKey}
                href={href}
                className="text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              >
                <span className="sr-only">{t(ariaKey)}</span>
                <Icon className="size-6" />
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-3 md:order-1">
            <Logo className="h-9 w-auto brightness-0 invert" />
            <p className="text-sm leading-6 text-muted-foreground">
              {t("copyright", { year })}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
