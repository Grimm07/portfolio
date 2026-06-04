# Static SPA origin. Private (Block-Public-Access), SSE-S3, versioned. Served ONLY through
# CloudFront via OAC — never public. Plan 2c uploads dist/ here with `aws s3 sync`.
# (Distinct from 2a's `…-messages` bucket, which holds private submission bodies and is
# never fronted by CloudFront.)
resource "aws_s3_bucket" "site" {
  bucket = "${local.name_prefix}-site"
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  bucket = aws_s3_bucket.site.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "site" {
  bucket = aws_s3_bucket.site.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Origin Access Control for the S3 origin (SigV4-signed origin requests). Replaces the
# legacy Origin Access Identity. signing_behavior = "always" so every origin request is signed.
resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${local.name_prefix}-site-oac"
  description                       = "OAC for the static-site S3 origin"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Bucket policy: allow ONLY this distribution (via the CloudFront service principal +
# SourceArn = the distribution ARN) to GetObject. References the distribution in cloudfront.tf
# — OpenTofu resolves the cross-file dependency at plan time.
data "aws_iam_policy_document" "site_oac" {
  statement {
    sid     = "AllowCloudFrontOACRead"
    effect  = "Allow"
    actions = ["s3:GetObject"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    resources = ["${aws_s3_bucket.site.arn}/*"]
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = data.aws_iam_policy_document.site_oac.json
}
