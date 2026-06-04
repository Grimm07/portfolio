# Edge WebACL. scope = CLOUDFRONT REQUIRES the provider region to be us-east-1 (it is, from 2a).
# Three rules, ascending priority:
#   1. AWS managed common rule set (broad OWASP-ish coverage), action inherited from the group.
#   2. Rate-based rule: volumetric per-IP throttle across ALL requests.
#   3. CAPTCHA action scoped to POST requests whose URI path starts with "/api/" — the contact
#      submission. WAF issues/validates the aws-waf-token; the Lambda never sees a CAPTCHA token.
# default_action = allow {} so the static site (GET /) is unchallenged.
resource "aws_wafv2_web_acl" "edge" {
  name        = "${local.name_prefix}-waf"
  description = "Edge WebACL for ${local.site_domain}: managed rules + rate limit + /api CAPTCHA"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Lets the WAF CAPTCHA JS SDK (Plan 2c frontend) obtain tokens valid for the site host + www.
  token_domains = [local.site_domain, "www.${local.site_domain}"]

  # --- Rule 1: AWS managed common rule set ---
  rule {
    name     = "common-rule-set"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-common"
      sampled_requests_enabled   = true
    }
  }

  # --- Rule 2: rate-based per-IP throttle ---
  rule {
    name     = "rate-limit"
    priority = 2

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000 # requests per 5-min sliding window per IP
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-rate"
      sampled_requests_enabled   = true
    }
  }

  # --- Rule 3: CAPTCHA on POST /api/* ---
  rule {
    name     = "captcha-api-post"
    priority = 3

    action {
      captcha {}
    }

    statement {
      and_statement {
        statement {
          byte_match_statement {
            search_string         = "/api/"
            positional_constraint = "STARTS_WITH"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
        statement {
          byte_match_statement {
            search_string         = "POST"
            positional_constraint = "EXACTLY"
            field_to_match {
              method {}
            }
            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
      }
    }

    # How long a solved CAPTCHA stays valid before re-challenge.
    captcha_config {
      immunity_time_property {
        immunity_time = 300
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-captcha"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name_prefix}-waf"
    sampled_requests_enabled   = true
  }
}

# API key the frontend WAF CAPTCHA JS SDK uses to request CAPTCHA tokens for the allowed
# domains. scope must match the WebACL (CLOUDFRONT). The token itself is exported as `api_key`.
resource "aws_wafv2_api_key" "captcha" {
  scope         = "CLOUDFRONT"
  token_domains = [local.site_domain, "www.${local.site_domain}"]
}
