variable "cloudflare_api_token" {
  description = "Cloudflare API token with appropriate permissions"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for the domain (trystan-tbm.dev)"
  type        = string
}

variable "turnstile_site_key" {
  description = "Cloudflare Turnstile site key for CAPTCHA"
  type        = string
}

variable "turnstile_secret_key" {
  description = "Cloudflare Turnstile secret key for CAPTCHA verification"
  type        = string
  sensitive   = true
}

variable "contact_email" {
  description = "Email address to receive contact form submissions"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Domain name for the portfolio (default: trystan-tbm.dev)"
  type        = string
  default     = "trystan-tbm.dev"
}

