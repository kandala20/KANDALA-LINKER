const TelegramBot = require('node-telegram-bot-api')
const { default: makeWASocket, useMultiFileAuthState, Browsers } = require('baileys')
const pino = require('pino')
const qrcode = require('qrcode')
const express = require('express')

// Dummy server kwa Render
const app = express()
const PORT = process.env.PORT || 3000
app.get('/', (req, res) => res.send('𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛® Bot is Live'))
app.listen(PORT, () => console.log(`Server running on ${PORT}`))

const TOKEN = process.env.TELEGRAM_TOKEN
const OWNER = '@kandala20'

if (!TOKEN) {
    console.log('ERROR: TELEGRAM_TOKEN haijawekwa Render!')
    process.exit(1)
}

const bot = new TelegramBot(TOKEN, { polling: true })

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
                [{ text: '
