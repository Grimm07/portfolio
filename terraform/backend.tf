# Remote Backend Configuration using GitLab Managed Terraform State
# This file is used by the deploy job in CI/CD
# The validation job uses -backend=false to skip this
#
# GitLab project "portfolio-tfstate" is used solely for state storage
# No code is stored there - just Terraform state via GitLab's API
#
# Setup:
# 1. GitLab Project Access Token with 'api' scope already created
# 2. Add token as GitHub secret: GITLAB_ACCESS_TOKEN

terraform {
  backend "http" {
    address        = "https://gitlab.com/api/v4/projects/77949451/terraform/state/portfolio"
    lock_address   = "https://gitlab.com/api/v4/projects/77949451/terraform/state/portfolio/lock"
    unlock_address = "https://gitlab.com/api/v4/projects/77949451/terraform/state/portfolio/lock"
    lock_method    = "POST"
    unlock_method  = "DELETE"
    retry_wait_min = 5
  }
}
