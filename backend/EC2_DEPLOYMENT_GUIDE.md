# EC2 Deployment Guide for MacroScope Backend

⚠️ **REMINDER**: You will need to manually create the `.env` file on the EC2 instance with your actual production credentials (it's not in the repository for security).

## Step 1: Launch EC2 Instance

### 1.1 Go to EC2 Console
- Navigate to: https://console.aws.amazon.com/ec2/
- Click **"Launch instance"**

### 1.2 Configure Instance
- **Name**: `macroscope-backend`
- **AMI**: Amazon Linux 2023 AMI (Free tier eligible)
- **Instance type**: `t3.micro` (Free tier) or `t3.small` (recommended)
- **Key pair**: Create new or use existing
  - Name: `macroscope-key`
  - Type: RSA
  - Format: .pem (for Mac/Linux) or .ppk (for Windows)
  - **Save this file securely!**

### 1.3 Network Settings
- **VPC**: Default
- **Subnet**: No preference
- **Auto-assign public IP**: Enable
- **Security group**: Create new
  - Name: `macroscope-backend-sg`
  - Description: Security group for MacroScope backend
  - Add rules:
    - SSH (22) - Your IP only
    - HTTP (80) - Anywhere
    - HTTPS (443) - Anywhere  
    - Custom TCP (3000) - Anywhere (for API)

### 1.4 Storage
- **8 GB gp3** (default is fine)

### 1.5 Launch
- Review and launch
- Instance will start in 1-2 minutes

## Step 2: Connect to Instance

### 2.1 Set Permissions on Key
```bash
chmod 400 ~/Downloads/macroscope-key.pem
```

### 2.2 Connect via SSH
```bash
ssh -i ~/Downloads/macroscope-key.pem ec2-user@YOUR-EC2-PUBLIC-IP
```

## Step 3: Install Software

### 3.1 Update System
```bash
sudo yum update -y
```

### 3.2 Install Node.js 20
```bash
# Install Node Version Manager
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install Node.js 20
nvm install 20
nvm use 20
node --version
```

### 3.3 Install PM2 (Process Manager)
```bash
npm install -g pm2
pm2 startup
# Follow the command it gives you
```

### 3.4 Install Git
```bash
sudo yum install git -y
```

### 3.5 Install Nginx (Reverse Proxy)
```bash
sudo yum install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Step 4: Deploy Application

### 4.1 Clone Repository
```bash
cd ~
git clone https://github.com/galotalp/macroscope.git
cd macroscope/backend
```

### 4.2 Create Production Environment File
⚠️ **IMPORTANT**: You must manually create the `.env` file with your actual credentials (it's not in the repository for security)

```bash
nano .env
```

Add your production environment variables (copy from your local `.env` file - use your actual values, not these placeholders):
```
# JWT Secret
JWT_SECRET=your-production-jwt-secret-key

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# Port
PORT=3000

# API Base URL
API_BASE_URL=https://api.macroscope.info

# Email Configuration
EMAIL_PROVIDER=ses
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
SES_FROM_EMAIL=noreply@macroscope.info
SES_FROM_NAME=MacroScope
```

### 4.3 Install Dependencies and Build
```bash
npm install
npm run build
```

### 4.4 Start with PM2
```bash
pm2 start ecosystem.config.js --env production
pm2 save
```

## Step 5: Configure Nginx

### 5.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/conf.d/macroscope.conf
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name api.macroscope.info;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5.2 Test and Reload Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Step 6: Configure Domain

### 6.1 In Route 53
Add an A record:
```
Type: A
Name: api
Value: [YOUR-EC2-PUBLIC-IP]
TTL: 300
```

### 6.2 Elastic IP (Recommended)
1. Go to EC2 → Elastic IPs
2. Allocate new address
3. Associate with your instance
4. Update Route 53 to point to Elastic IP

## Step 7: SSL Certificate with Let's Encrypt

### 7.1 Install Certbot
```bash
sudo yum install python3-certbot-nginx -y
```

### 7.2 Get Certificate
```bash
sudo certbot --nginx -d api.macroscope.info
```
Follow prompts and choose redirect option.

## Step 8: Security Hardening

### 8.1 Configure Firewall
```bash
# Remove port 3000 from security group (only allow 80/443)
# API will be accessed through Nginx
```

### 8.2 Enable Auto-updates
```bash
# For Amazon Linux 2023
sudo dnf install -y dnf-automatic
sudo sed -i 's/apply_updates = no/apply_updates = yes/' /etc/dnf/automatic.conf
sudo systemctl enable dnf-automatic.timer
sudo systemctl start dnf-automatic.timer
```

## Step 9: Monitoring

### 9.1 PM2 Monitoring
```bash
pm2 logs          # View logs
pm2 monit         # Real-time monitoring
pm2 status        # Check status
```

### 9.2 CloudWatch (Optional)
```bash
pm2 install pm2-cloudwatch
```

## Step 10: Deployment Updates

### 10.1 Manual Deploy
```bash
cd ~/macroscope/backend
./scripts/deploy.sh
```

### 10.2 Automated Deploy (GitHub Actions)
Create `.github/workflows/deploy.yml` in your repo:
```yaml
name: Deploy to EC2

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to EC2
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ec2-user
          key: ${{ secrets.EC2_KEY }}
          script: |
            cd ~/macroscope/backend
            ./scripts/deploy.sh
```

## Costs

- **t3.micro**: Free tier (1 year) then ~$8.50/month
- **t3.small**: ~$15/month
- **Elastic IP**: Free when attached, $3.60/month if not
- **Data transfer**: First 100GB free/month

## Troubleshooting

### Application not starting
```bash
pm2 logs
npm run build
```

### Nginx errors
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### Memory issues
```bash
free -m
pm2 restart all
```

### SSL renewal
```bash
sudo certbot renew --dry-run
```

## Backup Strategy

1. **Database**: Supabase handles backups
2. **Code**: In GitHub
3. **Environment**: Document all .env variables
4. **EC2**: Create AMI snapshot monthly

---

🎉 Your backend is now deployed on EC2!

## Important Reminders

⚠️ **Don't forget**: You must manually create the `.env` file with your production credentials on the EC2 instance!