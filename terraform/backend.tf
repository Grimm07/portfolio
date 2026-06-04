# Remote Backend — AWS S3
#
# State lives in the TF_STATE_BUCKET S3 bucket (provided in CI). Migrated off the GitLab
# HTTP backend so state sits alongside the AWS resources and CI authenticates via GitHub
# OIDC (no GitLab token needed).
#
# The bucket name is environment/CI-specific, so it is passed at init via partial
# backend-config rather than hardcoded here:
#
#   tofu init -backend-config="bucket=$TF_STATE_BUCKET"
#
# (TF_STATE_BUCKET is available in CI.) Everything else is fixed below.
#
# Per-env state separation uses OpenTofu workspaces under the same bucket — S3 backends
# support workspaces natively (unlike the old http backend):
#   prod -> `default` workspace -> s3://$TF_STATE_BUCKET/portfolio/terraform.tfstate
#   dev  -> `tofu workspace select -or-create dev` -> .../env:/dev/portfolio/terraform.tfstate
#
# Locking uses S3-native conditional writes (use_lockfile) — no DynamoDB lock table needed.
# Requires OpenTofu >= 1.10 (CI uses `tofu`, not the legacy `terraform` 1.6 binary).
terraform {
  backend "s3" {
    key          = "portfolio/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
