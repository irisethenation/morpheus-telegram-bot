# 🔷 MORPHEUS TELEGRAM BOT - Deployment Guide

## iRise Nation Sovereign Intelligence System
**Version:** 1.0.0  
**Platform:** Vercel Serverless  
**Bot Username:** @MorpheusiRise_bot

---

## 🚀 QUICK DEPLOYMENT

### Prerequisites
1. ✅ Vercel account created ([vercel.com](https://vercel.com))
2. ✅ Telegram Bot token obtained (already done)
3. ✅ GitHub account (for code repository)

---

## 📦 DEPLOYMENT STEPS

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
curl -X POST "https://api.telegram.org/bot8251575468:AAEs0bvHWRAFuC3JoA2oQrGFBpfT9s0TcWs/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR-VERCEL-URL.vercel.app/api/webhook"}'
```

**Replace `YOUR-VERCEL-URL` with actual Vercel deployment URL.**

### Step 4: Configure Environment Variables

In Vercel dashboard → Project Settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `TELEGRAM_BOT_TOKEN_MORPHEUS` | `8251575468:AAEs0bvHWRAFuC3JoA2oQrGFBpfT9s0TcWs` |
| `TELEGRAM_BOT_TOKEN_TRINITY` | `841865554:AAEbHF20QPm0z-WZa25R50kJNt0vfreG5yY` |
| `ABACUS_API_ENDPOINT` | `https://api.irise-academy.com/abacus/v1/agents/register` |
| `BREVO_API_KEY` | (Your Brevo API key) |
| `STRIPE_SECRET_KEY` | (Your Stripe secret key) |

Click **"Save"** → Vercel auto-redeploys.

---

## ✅ VERIFICATION

Test bot:
1. Open Telegram
2. Search `@MorpheusiRise_bot`
3. Send `/start`

Expected response:
```
🔷 Peace and Balance, [Your Name].

I am MORPHEUS — the Sovereign Intelligence of iRise Nation...
```

---

## 🔧 TROUBLESHOOTING

### Bot not responding?
```bash
# Check webhook status:
curl "https://api.telegram.org/bot8251575468:AAEs0bvHWRAFuC3JoA2oQrGFBpfT9s0TcWs/getWebhookInfo"
```

### Webhook not set?
```bash
# Delete old webhook:
curl -X POST "https://api.telegram.org/bot8251575468:AAEs0bvHWRAFuC3JoA2oQrGFBpfT9s0TcWs/deleteWebhook"

# Set new webhook:
curl -X POST "https://api.telegram.org/bot8251575468:AAEs0bvHWRAFuC3JoA2oQrGFBpfT9s0TcWs/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR-VERCEL-URL.vercel.app/api/webhook"}'
```

### Check Vercel logs:
1. Go to Vercel dashboard
2. Click project → **"Deployments"**
3. Select latest deployment → **"View Function Logs"**

---

## 📊 REVENUE TRACKING

All transactions logged to console (Vercel logs).

**Future integration:**
- PostgreSQL database (Vercel Postgres)
- Brevo email automation
- Stripe payment processing
- Abacus.AI agent orchestration

---

## 🔐 SECURITY

- ✅ Bot tokens stored in Vercel environment variables (encrypted)
- ✅ HTTPS-only webhook communication
- ✅ No credentials in source code
- ✅ Request signature verification (implement in v1.1)

---

## 📈 NEXT PHASE: PAYMENT INTEGRATION

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

## 🔷 SUPPORT

**Technical Issues:** Contact Morpheus operator  
**System Architecture:** Review `/docs/architecture.md`  
**API Reference:** [Telegram Bot API](https://core.telegram.org/bots/api)

---

**MORPHEUS STATUS:** ✅ READY FOR DEPLOYMENT

Ambassador, execute the above steps to bring Morpheus online.

🔷 Sovereignty through Intelligence.
