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

# Cloudflare Pages Project
# This resource creates a Pages project that automatically deploys from GitHub
resource "cloudflare_pages_project" "portfolio" {
  # Account ID where the Pages project will be created
  account_id = var.cloudflare_account_id

  # Project name displayed in Cloudflare dashboard
  name = "trystan-portfolio"

  # Production branch that triggers automatic deployments
  production_branch = "main"

  # Build configuration for the deployment process (v5 argument syntax)
  build_config = {
    # Command to build the Vite + React project
    build_command = "npm run build"

    # Directory containing built artifacts after build completes
    destination_dir = "dist"

    # Root directory of the project (project root)
    root_dir = "/"
  }

  # GitHub source configuration for automatic deployments (v5 argument syntax)
  source = {
    # Source type: GitHub integration
    type = "github"

    # GitHub repository configuration
    config = {
      # GitHub repository owner username
      owner = var.github_repo_owner

      # GitHub repository name
      repo_name = var.github_repo_name

      # Production branch to deploy from (triggers deployment on push)
      production_branch = "main"
    }
  }

  # Environment variables available during build process (v5 argument syntax)
  # These are injected at build time for Vite to use
  deployment_configs = {
    production = {
      environment_variables = {
        # Turnstile site key for frontend CAPTCHA integration
        # Vite requires VITE_ prefix to expose variables to client
        VITE_TURNSTILE_SITE_KEY = var.turnstile_site_key
      }
    }
    preview = {
      environment_variables = {
        # Same environment variable for preview deployments
        VITE_TURNSTILE_SITE_KEY = var.turnstile_site_key
      }
    }
  }
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
resource "cloudflare_workers_script" "contact_form" {
  # Account ID where the Worker will be deployed
  account_id = var.cloudflare_account_id

  # Worker script name in Cloudflare dashboard (v5: script_name instead of name)
  script_name = "portfolio-contact-worker"

  # Path to the built Worker JavaScript file
  # Note: This must be built before running terraform apply
  content = file("${path.module}/../worker/dist/index.js")

  # Bindings for environment variables (v5 argument syntax)
  bindings = [
    {
      # Turnstile secret key for CAPTCHA verification
      type = "secret_text"
      name = "TURNSTILE_SECRET_KEY"
      text = var.turnstile_secret_key
    },
    {
      # Email address to receive contact form submissions
      type = "secret_text"
      name = "CONTACT_EMAIL"
      text = var.contact_email
    }
  ]
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

  # Name of the Worker script to route requests to (v5: script instead of script_name)
  script = cloudflare_workers_script.contact_form.script_name
}
