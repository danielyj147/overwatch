variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type (t3.micro)"
  type        = string
  default     = "t4g.micro"
}

variable "domain_name" {
  description = "Full domain name for the application (e.g., overwatch.danielyj.com)"
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for danielyj.com"
  type        = string
}

variable "cloudflare_subdomain" {
  description = "Subdomain to create (e.g., 'overwatch' for overwatch.danielyj.com)"
  type        = string
  default     = "overwatch"
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token with Zone.DNS.Edit permissions"
  type        = string
  sensitive   = true
}

variable "ssh_public_key" {
  description = "SSH public key for EC2 access"
  type        = string
}

variable "ssh_allowed_cidrs" {
  description = "CIDR blocks allowed to SSH (use your IP for security, or 0.0.0.0/0 for open access)"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "db_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true
}

variable "hocuspocus_jwt_secret" {
  description = "JWT secret for Hocuspocus authentication"
  type        = string
  sensitive   = true
}
