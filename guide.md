# 🚀 AP Calculus Bot - Deployment Guide

This guide provides step-by-step instructions to deploy the AP Calculus Bot application to production.

## 📋 Prerequisites

### Required Accounts & Services
- [ ] **GitHub Account** (for code repository)
- [ ] **Supabase Account** (database & auth)
- [ ] **OpenAI Account** (AI/LLM services)
- [ ] **Stripe Account** (payments)
- [ ] **Vercel Account** (hosting - recommended)

### Required Tools
- [ ] **Node.js 18+** installed locally
- [ ] **pnpm** package manager
- [ ] **Git** for version control
- [ ] **Supabase CLI** (optional but recommended)

## 🔑 Step 1: Set Up Required Services

### 1.1 Supabase Setup (Database & Authentication)

1. **Create Supabase Account**
   - Go to [supabase.com](https://supabase.com)
   - Sign up with GitHub
   - Create a new project

2. **Get API Keys**
   - Go to Project Settings → API
   - Copy the following:
     - `Project URL` → `SUPABASE_URL`
     - `anon public` key → `SUPABASE_ANON_KEY`
     - `service_role` key → `SUPABASE_SERVICE_KEY`

3. **Set Up Database**
   ```bash
   # Install Supabase CLI (optional)
   npm install -g supabase
   
   # Link to your project
   cd /path/to/ap_bot
   supabase link --project-ref your-project-ref
   
   # Run migrations
   supabase db push
   ```

### 1.2 OpenAI Setup (AI Services)

1. **Create OpenAI Account**
   - Go to [platform.openai.com](https://platform.openai.com)
   - Sign up and verify your account

2. **Get API Key**
   - Go to API Keys section
   - Create a new secret key
   - Copy the key → `OPENAI_API_KEY`

3. **Set Usage Limits** (Recommended)
   - Go to Billing → Usage limits
   - Set monthly spending limit (e.g., $100)
   - Enable notifications

### 1.3 Stripe Setup (Payments)

1. **Create Stripe Account**
   - Go to [stripe.com](https://stripe.com)
   - Complete account setup and verification

2. **Get API Keys**
   - Go to Developers → API Keys
   - Copy the following:
     - `Publishable key` → `STRIPE_PUBLISHABLE_KEY`
     - `Secret key` → `STRIPE_SECRET_KEY`

3. **Set Up Webhooks**
   - Go to Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `customer.subscription.updated`
   - Copy webhook secret → `STRIPE_WEBHOOK_SECRET`

4. **Create Products & Prices**
   - Go to Products → Create product
   - Create products for each plan (Free, Pro, Teacher)
   - Copy price IDs to environment variables

### 1.4 Vercel Setup (Hosting)

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Connect Repository**
   - Import your GitHub repository
   - Select the `apps/web` folder as root directory
   - Configure build settings (auto-detected for Next.js)

## 🔧 Step 2: Configure Environment Variables

### 2.1 Create Environment Files

Create `.env.local` in the `apps/web` directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

# API Gateway Configuration
NEXT_PUBLIC_API_URL=https://your-api-gateway-url.vercel.app

# Application Configuration
NODE_ENV=production
```

### 2.2 Configure Vercel Environment Variables

1. **Go to Vercel Dashboard**
   - Select your project
   - Go to Settings → Environment Variables

2. **Add All Variables**
   - Add each variable from `.env.local`
   - Set environment to "Production"
   - Save all variables

## 🏗️ Step 3: Deploy API Gateway

### 3.1 Deploy API Gateway to Vercel

1. **Create New Vercel Project**
   - Import repository again
   - Select `apps/api-gateway` as root directory
   - Configure build settings:
     - Build Command: `pnpm build`
     - Output Directory: `dist`
     - Install Command: `pnpm install`

2. **Set Environment Variables**
   ```bash
   # Add all the same variables as web app
   # Plus additional API-specific variables
   VERIFIER_URL=https://your-verifier-service.vercel.app
   VAM_MIN_TRUST=0.92
   REDIS_URL=your_redis_url_here
   ```

3. **Deploy**
   - Deploy the API gateway
   - Copy the deployment URL
   - Update `NEXT_PUBLIC_API_URL` in web app

### 3.2 Deploy Python Services (Optional)

For the verifier service, you can deploy to:
- **Vercel** (with Python runtime)
- **Railway** (recommended for Python)
- **Heroku** (classic option)
- **Google Cloud Run** (scalable)

## 🚀 Step 4: Deploy Web Application

### 4.1 Deploy to Vercel

1. **Connect Repository**
   - Go to Vercel dashboard
   - Import your GitHub repository
   - Select `apps/web` as root directory

2. **Configure Build Settings**
   - Framework Preset: Next.js
   - Root Directory: `apps/web`
   - Build Command: `pnpm build`
   - Output Directory: `.next`
   - Install Command: `pnpm install`

3. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Test the deployment URL

### 4.2 Configure Custom Domain (Optional)

1. **Add Domain**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Configure DNS records as instructed

2. **Update Stripe Webhooks**
   - Update webhook URL to use custom domain
   - Test webhook delivery

## 🧪 Step 5: Test Deployment

### 5.1 Basic Functionality Tests

1. **Test Page Loading**
   ```bash
   # Test all pages load
   curl -I https://your-domain.com/coach
   curl -I https://your-domain.com/lessons
   curl -I https://your-domain.com/pricing
   ```

2. **Test API Endpoints**
   ```bash
   # Test API gateway
   curl https://your-api-gateway.vercel.app/health
   ```

3. **Test User Flows**
   - Visit the website
   - Try the coach chat interface
   - Test search functionality
   - Test pricing page

### 5.2 Payment Testing

1. **Test Stripe Integration**
   - Use Stripe test mode
   - Test checkout flow
   - Verify webhook delivery

2. **Test User Authentication**
   - Test sign up/sign in
   - Verify role-based access

## 📊 Step 6: Monitoring & Maintenance

### 6.1 Set Up Monitoring

1. **Vercel Analytics**
   - Enable Vercel Analytics
   - Monitor performance metrics

2. **Error Tracking**
   - Consider adding Sentry
   - Monitor application errors

3. **Uptime Monitoring**
   - Use UptimeRobot or similar
   - Set up alerts for downtime

### 6.2 Database Management

1. **Backup Strategy**
   - Enable Supabase backups
   - Set up automated backups

2. **Performance Monitoring**
   - Monitor database performance
   - Optimize queries as needed

## 💰 Cost Estimation

### Monthly Costs (Estimated)

| Service | Free Tier | Production | Notes |
|---------|-----------|------------|-------|
| **Supabase** | $0 | $25-100 | Database, auth, storage |
| **OpenAI** | $0 | $50-500 | AI responses, embeddings |
| **Stripe** | $0 | 2.9% + 30¢ | Per transaction |
| **Vercel** | $0 | $20-100 | Hosting, bandwidth |
| **Domain** | $0 | $1-2 | Optional custom domain |
| **Total** | **$0** | **$100-700** | Depends on usage |

### Cost Optimization Tips

1. **Start with Free Tiers**
   - Use free tiers initially
   - Upgrade as needed

2. **Monitor Usage**
   - Set spending limits
   - Monitor API usage

3. **Optimize Queries**
   - Use database indexes
   - Cache frequently accessed data

## 🔒 Security Checklist

### Pre-Deployment Security

- [ ] **Environment Variables**
  - [ ] No secrets in code
  - [ ] All secrets in environment variables
  - [ ] Different keys for dev/staging/prod

- [ ] **API Security**
  - [ ] Rate limiting enabled
  - [ ] CORS properly configured
  - [ ] Input validation implemented

- [ ] **Database Security**
  - [ ] RLS (Row Level Security) enabled
  - [ ] Proper user permissions
  - [ ] Regular security updates

- [ ] **Payment Security**
  - [ ] PCI compliance (handled by Stripe)
  - [ ] Webhook signature verification
  - [ ] Secure key management

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs
   vercel logs your-deployment-url
   
   # Test locally
   pnpm build
   ```

2. **Environment Variable Issues**
   - Verify all variables are set
   - Check variable names match exactly
   - Ensure no extra spaces or quotes

3. **API Connection Issues**
   - Verify API gateway is deployed
   - Check CORS configuration
   - Test API endpoints directly

4. **Database Connection Issues**
   - Verify Supabase credentials
   - Check database migrations
   - Test connection from API gateway

### Getting Help

1. **Check Logs**
   - Vercel function logs
   - Browser console errors
   - Network tab for API calls

2. **Test Locally**
   - Run `pnpm dev` locally
   - Test with production environment variables

3. **Community Support**
   - Vercel Discord
   - Supabase Discord
   - GitHub Issues

## 📚 Additional Resources

### Documentation
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)

### Tools
- [Vercel CLI](https://vercel.com/cli)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] All services configured
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] API gateway deployed
- [ ] Tests passing locally

### Post-Deployment
- [ ] All pages load correctly
- [ ] API endpoints working
- [ ] Authentication working
- [ ] Payments working
- [ ] Monitoring set up
- [ ] Documentation updated

## 🎉 Success!

Once all steps are completed, your AP Calculus Bot will be live and ready for users!

**Next Steps:**
1. Share the URL with beta users
2. Monitor usage and performance
3. Gather feedback and iterate
4. Scale as needed

---

**Need Help?** Check the troubleshooting section or create an issue in the GitHub repository.
