terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "overwatch-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "overwatch-igw"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "overwatch-public-subnet"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "overwatch-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Security Group
resource "aws_security_group" "overwatch" {
  name        = "overwatch-sg"
  description = "Security group for Overwatch EC2 instance"
  vpc_id      = aws_vpc.main.id

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "SSH access from anywhere"
  }

  # HTTP (for Let's Encrypt challenge)
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP for LetsEncrypt"
  }

  # HTTPS
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS traffic"
  }

  # Outbound (all traffic)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = {
    Name = "overwatch-sg"
  }
}

# SSH Key Pair
resource "aws_key_pair" "overwatch" {
  key_name   = "overwatch-key"
  public_key = var.ssh_public_key

  tags = {
    Name = "overwatch-key"
  }
}

# EC2 Instance
resource "aws_instance" "overwatch" {
  ami           = data.aws_ami.ubuntu_amd64.id 
  instance_type = var.instance_type
  key_name      = aws_key_pair.overwatch.key_name
  subnet_id     = aws_subnet.public.id

  vpc_security_group_ids = [aws_security_group.overwatch.id]

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true

    tags = {
      Name = "overwatch-root-volume"
    }
  }

  user_data = templatefile("${path.module}/user-data.sh", {
    db_password               = var.db_password
    hocuspocus_jwt_secret     = var.hocuspocus_jwt_secret
    admin_registration_secret = var.admin_registration_secret
    domain_name               = var.domain_name
  })

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  tags = {
    Name = "overwatch"
  }

  lifecycle {
    ignore_changes = [
      ami,
      user_data
    ]
  }
}

# Elastic IP
resource "aws_eip" "overwatch" {
  instance = aws_instance.overwatch.id
  domain   = "vpc"

  tags = {
    Name = "overwatch-eip"
  }

  depends_on = [aws_internet_gateway.main]
}

# Cloudflare DNS Record
resource "cloudflare_record" "overwatch" {
  zone_id = var.cloudflare_zone_id
  name    = var.cloudflare_subdomain
  content = aws_eip.overwatch.public_ip
  type    = "A"
  ttl     = 1 # Auto
  proxied = false # Must be false for Let's Encrypt to work

  comment = "Overwatch deployment - managed by Terraform"
}

# Data Sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_ami" "ubuntu_amd64" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]  # Changed from "arm64"
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}
