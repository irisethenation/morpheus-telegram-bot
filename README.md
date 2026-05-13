# Ã°ÂÂÂ· MORPHEUS TELEGRAM BOT - Deployment Guide

## iRise Nation Sovereign Intelligence System
**Version:** 1.0.0  
**Platform:** Vercel Serverless  
**Bot Username:** @MorpheusiRise_bot

---

## Ã°ÂÂÂ QUICK DEPLOYMENT

### Prerequisites
1. Ã¢ÂÂ Vercel account created ([vercel.com](https://vercel.com))
2. Ã¢ÂÂ Telegram Bot token obtained (already done)
3. Ã¢ÂÂ GitHub account (for code repository)

---

## Ã°ÂÂÂ¦ DEPLOYMENT STEPS

### Step 1: Upload Code to GitHub

```bash
# Create new repository on GitHub: morpheus-telegram-bot
# Clone locally:
git clone https://github.com/YOUR_USERNAME/morpheus-telegram-bot.git
cd morpheus-telegram-bot

# Copy all files from this package to the repository
# Then commit:
git add .
git commit -m "Initial Morpheus deployment"
git push origin main
```

### Step 2: Deploy to Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Select **"Import Git Repository"**
4. Choose `morpheus-telegram-bot`
5. Click **"Deploy"**

Vercel will automatically:
- Install dependencies
- Build the serverless function
- Generate HTTPS webhook URL

### Step 3: Set Webhook URL

After deployment, Vercel provides URL like:
```
https://morpheus-telegram-bot-xyz123.vercel.app
```

Set Telegram webhook:
```bash
curl -X POST "https://api.telegram.org/bot(your MORPHEUS bot token from BotFather)/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR-VERCEL-URL.vercel.app/api/webhook"}'
```

**Replace `YOUR-VERCEL-URL` with actual Vercel deployment URL.**

### Step 4: Configure Environment Variables

In Vercel dashboard Ã¢ÂÂ Project Settings Ã¢ÂÂ Environment Variables, add:

| Variable | Value |
|----------|-------|
| `TELEGRAM_BOT_TOKEN_MORPHEUS` | `(your MORPHEUS bot token from BotFather)` |
| `TELEGRAM_BOT_TOKEN_TRINITY` | `(your TRINITY bot token from BotFather)` |
| `ABACUS_API_ENDPOINT` | `https://api.irise-academy.com/abacus/v1/agents/register` |
| `BREVO_API_KEY` | (Your Brevo API key) |
| `STRIPE_SECRET_KEY` | (Your Stripe secret key) |

Click **"Save"** Ã¢ÂÂ Vercel auto-redeploys.

---

## Ã¢ÂÂ VERIFICATION

Test bot:
1. Open Telegram
2. Search `@MorpheusiRise_bot`
3. Send `/start`

Expected response:
```
Ã°ÂÂÂ· Peace and Balance, [Your Name].

I am MORPHEUS Ã¢ÂÂ the Sovereign Intelligence of iRise Nation...
```

---

## Ã°ÂÂÂ§ TROUBLESHOOTING

### Bot not responding?
```bash
# Check webhook status:
curl "https://api.telegram.org/bot(your MORPHEUS bot token from BotFather)/getWebhookInfo"
```

### Webhook not set?
```bash
# Delete old webhook:
curl -X POST "https://api.telegram.org/bot(your MORPHEUS bot token from BotFather)/deleteWebhook"

# Set new webhook:
curl -X POST "https://api.telegram.org/bot(your MORPHEUS bot token from BotFather)/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR-VERCEL-URL.vercel.app/api/webhook"}'
```

### Check Vercel logs:
1. Go to Vercel dashboard
2. Click project Ã¢ÂÂ **"Deployments"**
3. Select latest deployment Ã¢ÂÂ **"View Function Logs"**

---

## Ã°ÂÂÂ REVENUE TRACKING

All transactions logged to console (Vercel logs).

**Future integration:**
- PostgreSQL database (Vercel Postgres)
- Brevo email automation
- Stripe payment processing
- Abacus.AI agent orchestration

---

## Ã°ÂÂÂ SECURITY

- Ã¢ÂÂ Bot tokens stored in Vercel environment variables (encrypted)
- Ã¢ÂÂ HTTPS-only webhook communication
- Ã¢ÂÂ No credentials in source code
- Ã¢ÂÂ Request signature verification (implement in v1.1)

---

## Ã°ÂÂÂ NEXT PHASE: PAYMENT INTEGRATION

Once bot is live and responding:

1. **Stripe Setup**
   - Create Stripe account
   - Get API keys
   - Implement checkout flow

2. **Database Setup**
   - Enable Vercel Postgres
   - Store user states
   - Track transactions

3. **Abacus.AI Integration**
   - Implement agent spawning API
   - Route conversations to specialists
   - Automate trust intake workflow

4. **Email Automation**
   - Connect Brevo API
   - Send order confirmations
   - Trigger drip campaigns

---

## Ã°ÂÂÂ· SUPPORT

**Technical Issues:** Contact Morpheus operator  
**System Architecture:** Review `/docs/architecture.md`  
**API Reference:** [Telegram Bot API](https://core.telegram.org/bots/api)

---

**MORPHEUS STATUS:** Ã¢ÂÂ READY FOR DEPLOYMENT

Ambassador, execute the above steps to bring Morpheus online.

Ã°ÂÂÂ· Sovereignty through Intelligence.
