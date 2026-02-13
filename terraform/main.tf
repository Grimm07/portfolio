terraform {
  required_version = ">= 1.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.16"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Cloudflare Pages Project (Direct Upload)
# Frontend is built in CI with env vars and deployed via wrangler pages deploy
resource "cloudflare_pages_project" "portfolio" {
  account_id        = var.cloudflare_account_id
  name              = "trystan-portfolio"
  production_branch = "main"
}

# Cloudflare Pages Custom Domain
# Attaches the custom domain to the Pages project
# This enables the custom domain to serve the Pages deployment
resource "cloudflare_pages_domain" "portfolio" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.portfolio.name
  # v5: domain renamed to name
  name = var.domain_name
}

# DNS CNAME Record for Root Domain (v5: cloudflare_dns_record)
# Points the root domain (@) to the Cloudflare Pages deployment
# This allows trystan-tbm.dev to serve the portfolio site
resource "cloudflare_dns_record" "pages_root" {
  # Zone ID where the DNS record will be created
  zone_id = var.cloudflare_zone_id

  # Record name: '@' represents the root domain (trystan-tbm.dev)
  name = "@"

  # Record type: CNAME allows pointing to another domain
  type = "CNAME"

  # Target: Cloudflare Pages canonical domain for the project
  # Format: <project-name>.pages.dev
  content = "${cloudflare_pages_project.portfolio.name}.pages.dev"

  # Enable Cloudflare proxy (orange cloud)
  # This provides DDoS protection, CDN, and SSL/TLS encryption
  proxied = true

  # TTL: 1 means automatic (Cloudflare manages TTL)
  # When proxied, TTL is automatically set by Cloudflare
  ttl = 1
}

# DNS CNAME Record for WWW Subdomain (v5: cloudflare_dns_record)
# Points www.trystan-tbm.dev to the same Pages deployment
# This ensures both trystan-tbm.dev and www.trystan-tbm.dev work
resource "cloudflare_dns_record" "pages_www" {
  # Zone ID where the DNS record will be created
  zone_id = var.cloudflare_zone_id

  # Record name: 'www' creates www.trystan-tbm.dev
  name = "www"

  # Record type: CNAME allows pointing to another domain
  type = "CNAME"

  # Target: Cloudflare Pages canonical domain for the project
  # Format: <project-name>.pages.dev
  content = "${cloudflare_pages_project.portfolio.name}.pages.dev"

  # Enable Cloudflare proxy (orange cloud)
  # This provides DDoS protection, CDN, and SSL/TLS encryption
  proxied = true

  # TTL: 1 means automatic (Cloudflare manages TTL)
  # When proxied, TTL is automatically set by Cloudflare
  ttl = 1
}

# Cloudflare Worker for Contact Form
# IMPORTANT: Build Worker before applying Terraform
# Run: cd worker && npm run build
# This ensures worker/dist/index.js exists before Terraform reads it
#
# Uses the v5 provider pattern:
# 1. cloudflare_worker - Creates the Worker container
# 2. cloudflare_worker_version - Defines ESM module content
# 3. cloudflare_workers_deployment - Deploys the version

# Worker container
resource "cloudflare_worker" "contact_form" {
  account_id = var.cloudflare_account_id
  name       = "portfolio-contact-worker"
}

# Worker version with ESM module
resource "cloudflare_worker_version" "contact_form" {
  account_id = var.cloudflare_account_id
  worker_id  = cloudflare_worker.contact_form.id

  # Entry point module name
  main_module = "index.js"

  # Compatibility settings (must match wrangler.toml)
  compatibility_date  = "2024-01-01"
  compatibility_flags = ["nodejs_compat"]

  # ESM module content
  modules = [{
    name         = "index.js"
    content_type = "application/javascript+module"
    content_file = "${path.module}/../worker/dist/index.js"
  }]

  # Secret bindings
  bindings = [
    {
      type = "secret_text"
      name = "TURNSTILE_SECRET_KEY"
      text = var.turnstile_secret_key
    },
    {
      type = "secret_text"
      name = "CONTACT_EMAIL"
      text = var.contact_email
    }
  ]
}

# Deploy the version
resource "cloudflare_workers_deployment" "contact_form" {
  account_id  = var.cloudflare_account_id
  script_name = cloudflare_worker.contact_form.name
  strategy    = "percentage"

  versions = [{
    version_id = cloudflare_worker_version.contact_form.id
    percentage = 100
  }]
}

# Cloudflare Worker Route
# Attaches the Worker to a custom domain route pattern
# This routes all requests matching the pattern to the Worker script
resource "cloudflare_workers_route" "contact_form" {
  # Zone ID for the domain where the route will be attached
  zone_id = var.cloudflare_zone_id

  # URL pattern to match requests (wildcard for all /api/* routes)
  # Example: trystan-tbm.dev/api/contact, trystan-tbm.dev/api/health, etc.
  pattern = "${var.domain_name}/api/*"

  # Name of the Worker script to route requests to
  script = cloudflare_worker.contact_form.name
}
