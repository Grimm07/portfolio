terraform {
  required_version = ">= 1.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.16"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.6"
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

# DNS CNAME Record for Root Domain — points apex at the AWS CloudFront edge (Plan 2c cutover).
resource "cloudflare_dns_record" "pages_root" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  type    = "CNAME"

  # DNS-only (grey cloud): Cloudflare is name-service only; CloudFront (2b) serves the site
  # and terminates TLS via its ACM cert. Apex CNAME resolves via Cloudflare CNAME flattening.
  content = aws_cloudfront_distribution.site.domain_name
  proxied = false
  ttl     = 300
}

# DNS CNAME Record for WWW Subdomain — points www at the AWS CloudFront edge (Plan 2c cutover).
resource "cloudflare_dns_record" "pages_www" {
  zone_id = var.cloudflare_zone_id
  name    = "www"
  type    = "CNAME"

  # DNS-only (grey cloud) → CloudFront, same as the apex record above.
  content = aws_cloudfront_distribution.site.domain_name
  proxied = false
  ttl     = 300
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
