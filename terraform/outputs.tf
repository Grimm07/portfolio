output "pages_url" {
  description = "Cloudflare Pages deployment URL (canonical .pages.dev domain)"
  value       = "https://${cloudflare_pages_project.portfolio.name}.pages.dev"
}

output "custom_domain_url" {
  description = "Custom domain URL for the portfolio (trystan-tbm.dev)"
  value       = "https://${var.domain_name}"
}

output "www_domain_url" {
  description = "WWW subdomain URL (www.trystan-tbm.dev)"
  value       = "https://www.${var.domain_name}"
}

output "worker_url" {
  description = "Cloudflare Worker endpoint URL for testing contact form submissions"
  value       = "https://${var.domain_name}/api/contact"
}

output "turnstile_site_key" {
  description = "Turnstile site key for frontend .env configuration"
  value       = var.turnstile_site_key
  sensitive   = false
}
