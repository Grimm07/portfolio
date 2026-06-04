# Managed policies (data sources, by canonical name):
#   - origin-request "AllViewerExceptHostHeader": forwards all viewer headers EXCEPT Host, so
#     the Lambda Function URL accepts the request (it rejects a mismatched Host).
#   - cache policy "Managed-CachingDisabled": no caching for the dynamic /api/* origin.
#   - cache policy "Managed-CachingOptimized": cache the static SPA.
data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

# OAC for the Lambda Function URL origin (SigV4-signed origin requests to the IAM-locked URL).
resource "aws_cloudfront_origin_access_control" "lambda" {
  name                              = "${local.name_prefix}-lambda-oac"
  description                       = "OAC for the ingest Lambda Function URL origin"
  origin_access_control_origin_type = "lambda"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

locals {
  s3_origin_id     = "${local.name_prefix}-s3-site"
  lambda_origin_id = "${local.name_prefix}-lambda-ingest"
  # Function URL is "https://<id>.lambda-url.<region>.on.aws/" — CloudFront origins want the
  # bare host, so strip the scheme and any trailing slash.
  lambda_origin_host = replace(replace(aws_lambda_function_url.ingest.function_url, "https://", ""), "/", "")
  # prod serves apex + www; non-prod just the env host.
  site_aliases = local.env == "prod" ? [local.site_domain, "www.${local.site_domain}"] : [local.site_domain]
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = local.name_prefix
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  aliases             = local.site_aliases
  web_acl_id          = aws_wafv2_web_acl.edge.arn

  # --- Origin A: static-site S3 bucket (OAC) ---
  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = local.s3_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  # --- Origin B: ingest Lambda Function URL (custom origin over HTTPS, OAC lambda) ---
  origin {
    domain_name              = local.lambda_origin_host
    origin_id                = local.lambda_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.lambda.id

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only" # Function URL is HTTPS-only
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default behavior → static SPA from S3.
  default_cache_behavior {
    target_origin_id       = local.s3_origin_id
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
  }

  # /api/* behavior → Lambda Function URL origin. All methods, no caching, forward all viewer
  # headers except Host (so the Function URL accepts the request), and let WAF challenge POSTs.
  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = local.lambda_origin_id
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    viewer_protocol_policy   = "redirect-to-https"
    compress                 = true
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name = local.name_prefix
  }
}
