import type { ComponentType, SVGProps } from "react"
import {
  SocialFacebookIcon,
  SocialGithubIcon,
  SocialInstagramIcon,
  SocialXIcon,
  SocialYoutubeIcon,
} from "@/components/layout/footer-social-icons"

export type FooterLinkItem = {
  messageKey: string
  href: string
}

export type FooterSocialItem = {
  ariaKey: string
  href: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}

export const footerSolutions: FooterLinkItem[] = [
  { messageKey: "marketing", href: "#" },
  { messageKey: "analytics", href: "#" },
  { messageKey: "automation", href: "#" },
  { messageKey: "commerce", href: "#" },
  { messageKey: "insights", href: "#" },
]

export const footerSupport: FooterLinkItem[] = [
  { messageKey: "submitTicket", href: "#" },
  { messageKey: "documentation", href: "#" },
  { messageKey: "guides", href: "#" },
]

export const footerCompany: FooterLinkItem[] = [
  { messageKey: "about", href: "#" },
  { messageKey: "blog", href: "/blog" },
  { messageKey: "jobs", href: "#" },
  { messageKey: "press", href: "#" },
]

export const footerLegal: FooterLinkItem[] = [
  { messageKey: "terms", href: "#" },
  { messageKey: "privacy", href: "#" },
  { messageKey: "license", href: "#" },
]

export const footerSocial: FooterSocialItem[] = [
  { ariaKey: "socialFacebook", href: "#", Icon: SocialFacebookIcon },
  { ariaKey: "socialInstagram", href: "#", Icon: SocialInstagramIcon },
  { ariaKey: "socialX", href: "#", Icon: SocialXIcon },
  { ariaKey: "socialGithub", href: "#", Icon: SocialGithubIcon },
  { ariaKey: "socialYoutube", href: "#", Icon: SocialYoutubeIcon },
]
