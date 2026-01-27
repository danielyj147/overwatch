output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.overwatch.id
}

output "instance_public_ip" {
  description = "Elastic IP address"
  value       = aws_eip.overwatch.public_ip
}

output "domain_url" {
  description = "Application URL"
  value       = "https://${var.domain_name}"
}

output "ssh_command" {
  description = "SSH command to connect to instance"
  value       = "ssh -i ~/.ssh/overwatch-ec2 ubuntu@${aws_eip.overwatch.public_ip}"
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.overwatch.id
}

output "cloudflare_record_name" {
  description = "Cloudflare DNS record name"
  value       = cloudflare_record.overwatch.name
}
