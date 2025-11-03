# Deployment Guide

This guide covers deploying the Collaborative Text Editor to AWS EC2.

## Prerequisites

- AWS Account
- Domain name (optional but recommended)
- Google Gemini API key
- Supabase project

## AWS EC2 Deployment Steps

### 1. Launch EC2 Instance

1. Go to AWS EC2 Console
2. Click "Launch Instance"
3. Choose Ubuntu Server 22.04 LTS
4. Instance type: t2.medium (minimum) or t2.large (recommended)
5. Configure security group:
   - SSH (22) - Your IP only
   - HTTP (80) - 0.0.0.0/0
   - HTTPS (443) - 0.0.0.0/0
   - Custom TCP (3001) - 0.0.0.0/0 (for API)
6. Create or select a key pair
7. Launch instance

### 2. Connect to Your Instance

```bash
ssh -i your-key.pem ubuntu@your-instance-ip
```

### 3. Install Node.js

```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 4. Install Git and Clone Repository

```bash
sudo apt install git -y
git clone your-repository-url
cd collaborative-editor
```

### 5. Set Up Environment Variables

```bash
nano .env
```

Add the following:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
JWT_SECRET=your_very_secure_jwt_secret_min_32_chars
GEMINI_API_KEY=your_gemini_api_key
PORT=3001
NODE_ENV=production
FRONTEND_URL=http://your-domain-or-ip
```

### 6. Install Dependencies and Build

```bash
npm install
npm run build
```

### 7. Install PM2 for Process Management

```bash
sudo npm install -g pm2

# Start the server
pm2 start server/index.js --name collab-editor

# Setup PM2 to start on boot
pm2 startup
pm2 save
```

### 8. Install and Configure Nginx

```bash
sudo apt install nginx -y
```

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/collab-editor
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # or your EC2 IP

    # Serve frontend static files
    location / {
        root /home/ubuntu/collaborative-editor/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Proxy WebSocket connections
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/collab-editor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 9. Set Up SSL with Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 10. Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 11. Monitor Application

```bash
# View logs
pm2 logs collab-editor

# Monitor processes
pm2 monit

# Restart application
pm2 restart collab-editor

# View status
pm2 status
```

## Docker Deployment (Alternative)

### 1. Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["node", "server/index.js"]
```

### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - NODE_ENV=production
    restart: unless-stopped
```

### 3. Deploy with Docker

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Post-Deployment Checklist

- [ ] Application accessible via browser
- [ ] User registration works
- [ ] User login works
- [ ] Document creation works
- [ ] Real-time collaboration works
- [ ] AI features work (if Gemini API configured)
- [ ] Document sharing works
- [ ] SSL certificate installed
- [ ] Auto-save functionality works
- [ ] PM2 configured to restart on reboot

## Performance Optimization

### 1. Enable Compression

Add to Nginx configuration:

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
```

### 2. Increase PM2 Instances

```bash
pm2 start server/index.js -i max --name collab-editor
```

### 3. Configure Node.js Memory

```bash
pm2 start server/index.js --name collab-editor --max-memory-restart 1G
```

## Monitoring and Logging

### Set Up PM2 Monitoring

```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Set Up CloudWatch (Optional)

1. Install CloudWatch agent
2. Configure log streaming
3. Set up alarms for:
   - High CPU usage
   - High memory usage
   - Application errors

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs collab-editor

# Check if port is in use
sudo netstat -tulpn | grep 3001

# Restart application
pm2 restart collab-editor
```

### WebSocket Issues

- Ensure security group allows traffic on port 3001
- Check Nginx WebSocket configuration
- Verify CORS settings in server

### Database Connection Issues

- Verify Supabase credentials
- Check network connectivity
- Review RLS policies

### SSL Certificate Issues

```bash
# Renew certificate manually
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

## Security Best Practices

1. **Keep System Updated**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Use Strong JWT Secret**
   - Minimum 32 characters
   - Random characters

3. **Restrict SSH Access**
   - Use key-based authentication
   - Disable password authentication
   - Limit to specific IP addresses

4. **Enable Firewall**
   - Only allow necessary ports
   - Use UFW or AWS Security Groups

5. **Regular Backups**
   - Backup Supabase database regularly
   - Export environment variables securely

6. **Monitor Logs**
   - Check application logs daily
   - Set up alerts for errors

## Scaling Considerations

### Horizontal Scaling

- Use AWS Load Balancer
- Deploy multiple EC2 instances
- Use Redis for session storage
- Configure sticky sessions for WebSocket

### Database Scaling

- Use Supabase connection pooling
- Enable read replicas
- Optimize database queries

### CDN Integration

- Use CloudFront for static assets
- Cache API responses where appropriate

## Maintenance

### Regular Tasks

1. **Weekly**
   - Check application logs
   - Monitor resource usage
   - Review error rates

2. **Monthly**
   - Update dependencies
   - Review security patches
   - Backup database

3. **Quarterly**
   - Review and optimize performance
   - Update Node.js version
   - Security audit

## Support

For deployment issues:
1. Check application logs: `pm2 logs collab-editor`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify environment variables
4. Check Supabase connection
5. Verify Gemini API key

## Cost Estimation

### AWS EC2

- t2.medium: ~$30/month
- t2.large: ~$60/month
- Data transfer: ~$10-20/month
- EBS storage: ~$10/month

### Supabase

- Free tier: $0 (limited usage)
- Pro: $25/month

### Google Gemini API

- Free tier available
- Pay-as-you-go pricing

**Total Estimated Cost: $50-100/month**

## Next Steps After Deployment

1. Set up monitoring and alerts
2. Configure automated backups
3. Implement CI/CD pipeline
4. Add custom domain
5. Set up analytics
6. Create deployment documentation
7. Plan disaster recovery

Your collaborative text editor should now be live and accessible!
