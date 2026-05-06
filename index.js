const TelegramBot = require('node-telegram-bot-api')
const { default: makeWASocket, useMultiFileAuthState, Browsers } = require('baileys')
const pino = require('pino')
const qrcode = require('qrcode')
const express = require('express')

const app = express()
app.use(express.json())
const PORT = process.env.PORT || 3000
const TOKEN = process.env.TELEGRAM_TOKEN
const OWNER = '@kandala20'
const URL = process.env.RENDER_EXTERNAL_URL || `https://kandala-linker.onrender.com`

if (!TOKEN) {
    console.log('ERROR: TELEGRAM_TOKEN is not set in Render!')
    process.exit(1)
}

// USE WEBHOOK INSTEAD OF POLLING TO PREVENT 409 CONFLICTS
const bot = new TelegramBot(TOKEN)
bot.setWebHook(`${URL}/bot${TOKEN}`)

// Webhook endpoint for Telegram
app.post(`/bot${TOKEN}`, (req, res) => {
    bot.processUpdate(req.body)
    res.sendStatus(200)
})

// Health check for Render
app.get('/', (req, res) => res.send('𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛® Bot is Live'))
app.listen(PORT, async () => {
    console.log(`Server running on ${PORT}`)
    await bot.setWebHook(`${URL}/bot${TOKEN}`)
    console.log('𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛® Linker running with WEBHOOK...')
})

const mainMenu = (chatId) => {
    const text = `┌─❰ 𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛® BOT LINKER ❱
│
│ Yo Kandala! 👊 Ready to get your own bot?
│
│ No stress. No waiting.
│ Just tap, link, and go!
│ 🚀 Your bot. Your number. Your rules.
│
│ ⚡ *What you get:*
│ ✅ Instant setup — under 2 minutes
│ ✅ Full bot features on YOUR number
│ ✅ Encrypted & secure sessions
│ ✅ Trusted by hundreds of users
│
│ ⬇️ Choose what you want to do below 👇
│
└─❰ 𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛 © 2026 ❱`

    const opts = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '⚡ Link My WhatsApp', callback_data: 'link_wa' }],
                [{ text: '📖 How It Works', callback_data: 'how' }, { text: '💬 Contact Owner', url: `https://t.me/${OWNER
