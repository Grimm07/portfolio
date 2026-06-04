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

# Cloudflare is retained for DNS only (name service). The static site + /api backend are
# served by the AWS CloudFront edge (Plan 2b). The Cloudflare Pages project and the contact
# Worker were removed in the Plan 2c cutover; these two DNS records (→ CloudFront) and the
# SES DKIM CNAMEs (ses.tf, Plan 2a) are the only Cloudflare resources that remain.

# DNS CNAME Record for Root Domain — points apex at the AWS CloudFront edge.
resource "cloudflare_dns_record" "pages_root" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  type    = "CNAME"

  # DNS-only (grey cloud): CloudFront serves the site + terminates TLS (ACM cert).
  # Apex CNAME resolves via Cloudflare CNAME flattening.
  content = aws_cloudfront_distribution.site.domain_name
  proxied = false
  ttl     = 300
}

# DNS CNAME Record for WWW Subdomain — points www at the AWS CloudFront edge.
resource "cloudflare_dns_record" "pages_www" {
  zone_id = var.cloudflare_zone_id
  name    = "www"
  type    = "CNAME"

  content = aws_cloudfront_distribution.site.domain_name
  proxied = false
  ttl     = 300
}
