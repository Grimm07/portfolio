# Public TLS cert for CloudFront. CloudFront REQUIRES the cert in us-east-1 — the 2a
# aws provider is already us-east-1, so no alias is needed. DNS-validated via Cloudflare.
# prod => apex + www; dev => dev.<domain> + www.dev.<domain> (both from local.site_domain).
resource "aws_acm_certificate" "site" {
  domain_name               = local.site_domain
  subject_alternative_names = ["www.${local.site_domain}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${local.name_prefix}-cert"
  }
}

# One DNS-only (grey-cloud) CNAME per domain_validation_option, keyed by domain_name so the
# set ordering can't cause spurious diffs (current AWS-provider-recommended pattern).
resource "cloudflare_dns_record" "acm_validation" {
  for_each = {
    for dvo in aws_acm_certificate.site.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id = var.cloudflare_zone_id
  # Cloudflare appends the zone automatically; strip the trailing dot from the FQDN ACM gives.
  name    = trimsuffix(each.value.name, ".")
  type    = each.value.type
  content = trimsuffix(each.value.record, ".")
  proxied = false
  ttl     = 60
}

# Blocks until ACM observes the CNAMEs and marks the cert ISSUED.
resource "aws_acm_certificate_validation" "site" {
  certificate_arn         = aws_acm_certificate.site.arn
  validation_record_fqdns = [for r in cloudflare_dns_record.acm_validation : r.name]
}
