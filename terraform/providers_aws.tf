# AWS provider + supporting providers for the contact backend (Plan 2a).
# ACM/CloudFront/WAF in Plan 2b also require us-east-1, so a single region keeps things simple.
#
# NOTE: provider version pins for aws/archive live in main.tf's single `required_providers`
# block. OpenTofu permits only ONE required_providers per module (the plan's original note
# that they merge across files was incorrect), so they are consolidated there.

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project   = "portfolio-contact"
      ManagedBy = "opentofu"
    }
  }
}

locals {
  env         = var.environment                  # "prod" | "dev"
  name_prefix = "portfolio-contact-${local.env}" # re-keys all 2a resource names
  # prod serves the apex domain; non-prod serves "<env>.<domain>" (e.g. dev.trystan-tbm.dev)
  site_domain = local.env == "prod" ? var.domain_name : "${local.env}.${var.domain_name}"
  # Derive the From address from the domain — no email literal hardcoded.
  from_email = "noreply@${var.domain_name}"
}
