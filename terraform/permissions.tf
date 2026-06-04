# Phase 3 wiring: allow CloudFront (OAC, SigV4) to invoke the IAM-auth Function URL, scoped to
# THIS env's distribution. Without this, OAC-signed requests get 403. The dist ARN is read from
# SSM (published by the infra repo in Phase 2) with no default, so a missing param fails loudly.
data "aws_ssm_parameter" "cf_arn" {
  name = "/portfolio/${var.environment}/cloudfront-distribution-arn"
}

resource "aws_lambda_permission" "cf_invoke_url" {
  statement_id           = "AllowCloudFrontOACInvokeUrl"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.ingest.function_name
  principal              = "cloudfront.amazonaws.com"
  source_arn             = data.aws_ssm_parameter.cf_arn.value
  function_url_auth_type = "AWS_IAM"
}
