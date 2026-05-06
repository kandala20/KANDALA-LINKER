const TelegramBot = require('node-telegram-bot-api')
const { default: makeWASocket, useMultiFileAuthState, Browsers, fetchLatestBaileysVersion } = require('baileys')
const pino = require('pino')
const qrcode = require('qrcode')
const express = require('express')
const fs = require('fs')

const app = express()
app.use(express.json())
const PORT = process.env.PORT || 3000
const TOKEN = process.env.TELEGRAM_TOKEN
const OWNER = '@KandalaDev'
const URL = process.env.RENDER_EXTERNAL_URL || 'https://kandala-linker.onrender.com'

if (!TOKEN) {
    console.log('ERROR: TELEGRAM_TOKEN is not set in Render!')
    process.exit(1)
}

const bot = new TelegramBot(TOKEN)
global.activeSocks = {}

app.post(`/bot${TOKEN}`, (req, res) => {
    bot.processUpdate(req.body)
    res.sendStatus(200)
})

app.get('/', (req, res) => res.send('𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛® Bot is Live'))

app.listen(PORT, async () => {
    console.log(`Server running on ${PORT}`)
    try {
        await bot.setWebHook(`${URL}/bot${TOKEN}`)
        console.log('𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛® Linker running with WEBHOOK...')
    } catch (e) {
        console.log('Webhook error:', e.message)
    }
})

const mainMenu = (chatId) => {
    const text = `┌─❰ 𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛® BOT LINKER ❱
│
│ Yo Kandala! 👊 QR imebanwa 2026
│
│ *Tumia Pairing Code sasa*
│ 🚀 Your bot. Your number. Your rules.
│
│ ⚡ *What you get:*
│ ✅ Instant setup — under 2 minutes
│ ✅ Full bot features on YOUR number
│ ✅ 8+ Active Commands
│
│ ⬇️ Choose method below 👇
│
└─❰ 𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛 © 2026 ❱`

    const ownerLink = `https://t.me/${OWNER.replace('@', '')}`

    const opts = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '📱 Get Pairing Code - INAFANYA', callback_data: 'get_code' }],
                [{ text: '🔳 Get QR Code - IMEBANWA', callback_data: 'get_qr' }],
                [{ text: '📖 How It Works', callback_data: 'how' }, { text: '💬 Contact Owner', url: ownerLink }],
                [{ text: '📱 My Sessions', callback_data: 'sessions' }]
            ]
        }
    }
    bot.sendMessage(chatId, text, opts)
}

bot.onText(/\/start/, (msg) => mainMenu(msg.chat.id))

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id
    const data = query.data
    bot.answerCallbackQuery(query.id)

    if (data === 'get_code') {
        await bot.sendMessage(chatId, 'Tuma namba yako ya WhatsApp na country code\n\n*Mfano:* `254712345678`\n\n⚠️ Usianze na + au 0', { parse_mode: 'Markdown' })

        bot.once('message', async (msg) => {
            if (msg.chat.id !== chatId) return
            const number = msg.text.replace(/[^0-9]/g, '')
            
            if (number.length < 11) {
                return bot.sendMessage(chatId, '❌ Namba si sahihi. Hakikisha umeweka country code\n\nMfano: 254712345678')
            }

            const waitMsg = await bot.sendMessage(chatId, '⏳ Generating pairing code...')

            try {
                if (global.activeSocks[chatId]) {
                    await global.activeSocks[chatId].end()
                    delete global.activeSocks[chatId]
                }

                const sessionPath = `session_qr/${chatId}`
                if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true })

                const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
                const { version } = await fetchLatestBaileysVersion()

                const sock = makeWASocket({
                    version,
                    auth: state,
                    logger: pino({ level: 'silent' }),
                    browser: Browsers.windows('Chrome'),
                    printQRInTerminal: false,
                    syncFullHistory: false,
                    markOnlineOnConnect: false
                })

                sock.ev.on('creds.update', saveCreds)

                if (!sock.authState.creds.registered) {
                    const code = await sock.requestPairingCode(number)
                    await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {})
                    await bot.sendMessage(chatId, `*PAIRING CODE YAKO:*\n\n\`${code}\`\n\n*HATUA:*\n1. WhatsApp > Settings > Linked Devices\n2. Gonga "Link a device"\n3. Chini chagua "Link with phone number instead"\n4. Weka code hii\n\n⏰ *Code inakufa 20 seconds - haraka!*`, { parse_mode: 'Markdown' })
                }

                sock.ev.on('connection.update', async (update) => {
                    const { connection, lastDisconnect } = update
                    if (connection === 'open') {
                        global.activeSocks[chatId] = sock
                        await bot.sendMessage(chatId, '✅ *CONNECTED!* Bot yako iko live. Andika *menu* WhatsApp.', { parse_mode: 'Markdown' })

                        sock.ev.on('messages.upsert', async (m) => {
                            const msg = m.messages[0]
                            if (!msg.key.fromMe && msg.message) {
                                const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ""
                                const from = msg.key.remoteJid
                                const sender = msg.key.participant || from
                                const pushname = msg.pushName || "User"
                                const isGroup = from.endsWith('@g.us')

                                await sock.sendPresenceUpdate('composing', from)
                                await new Promise(r => setTimeout(r, 1000))

                                if (text.match(/^\*?menu\*?$/i)) {
                                    await sock.sendMessage(from, {
                                        text: `┌─❰ 𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛® ❱\n│\n│ Hello *${pushname}* 👋\n│\n│ *📋 COMMANDS:*\n│ 1. *ping* - Speed test\n│ 2. *owner* - Owner info\n│ 3. *info* - Bot info\n│ 4. *ai text* - Ask AI\n│\n│ *📱 GROUP ONLY:*\n│ 5. *groupinfo* - Group info\n│ 6. *tagall* - Tag everyone\n│ 7. *hidetag text* - Hidden tag\n│ 8. *kick @user* - Remove user\n│\n└─❰ 8 Commands Active ❱`,
                                        mentions: [sender]
                                    })
                                }
                                else if (text.match(/^\*?ping\*?$/i)) {
                                    const start = Date.now()
                                    await sock.sendPresenceUpdate('recording', from)
                                    await new Promise(r => setTimeout(r, 1000))
                                    const end = Date.now()
                                    await sock.sendMessage(from, { text: `🏓 *Pong!*\n\nSpeed: *${end - start}ms*\nStatus: Online ✅\nMode: ${isGroup? 'Group' : 'Private'}` })
                                }
                                else if (text.match(/^\*?owner\*?$/i)) {
                                    await sock.sendMessage(from, { text: `*𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛® OWNER*\n\n👨‍💻 @KandalaDev\n🌐 github.com/kandala20\n\nPowered by Baileys 2026` })
                                }
                                else if (text.match(/^\*?info\*?$/i)) {
                                    await sock.sendMessage(from, { text: `*𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛® BOT*\n\n📊 Version: 2.0.0\n⚡ Baileys: Latest\n🔒 Mode: ${isGroup? 'Group' : 'Private'}\n📅 Year: 2026\n👤 User: ${pushname}` })
                                }
                                else if (text.match(/^\*?groupinfo\*?$/i)) {
                                    if (!isGroup) return sock.sendMessage(from, { text: '❌ Command hii ni ya group tu!' })
                                    const meta = await sock.groupMetadata(from)
                                    const admins = meta.participants.filter(p => p.admin).map(p => p.id)
                                    await sock.sendMessage(from, {
                                        text: `*📊 GROUP INFO*\n\n*Name:* ${meta.subject}\n*Members:* ${meta.participants.length}\n*Admins:* ${admins.length}\n*Created:* ${new Date(meta.creation * 1000).toLocaleDateString()}`,
                                        mentions: admins
                                    })
                                }
                                else if (text.match(/^\*?tagall\*?$/i)) {
                                    if (!isGroup) return sock.sendMessage(from, { text: '❌ Command hii ni ya group tu!' })
                                    const meta = await sock.groupMetadata(from)
                                    const members = meta.participants.map(p => p.id)
                                    let teks = `*📢 TAG ALL*\n\n*Group:* ${meta.subject}\n*Members:* ${members.length}\n*By:* @${sender.split('@')[0]}\n\n`
                                    teks += members.map((v, i) => `${i + 1}. @${v.split('@')[0]}`).join('\n')
                                    await sock.sendMessage(from, { text: teks, mentions: [...members, sender] })
                                }
                                else if (text.toLowerCase().startsWith('*hidetag') || text.toLowerCase().startsWith('hidetag')) {
                                    if (!isGroup) return sock.sendMessage(from, { text: '❌ Command hii ni ya group tu!' })
                                    const hidetagText = text.replace(/^\*?hidetag\*?/i, '').trim()
                                    if (!hidetagText) return sock.sendMessage(from, { text: '*USAGE:* *hidetag your message*' })
                                    const meta = await sock.groupMetadata(from)
                                    const members = meta.participants.map(p => p.id)
                                    await sock.sendPresenceUpdate('recording', from)
                                    await sock.sendMessage(from, { text: hidetagText, mentions: members })
                                }
                                else if (text.toLowerCase().startsWith('*kick') || text.toLowerCase().startsWith('kick')) {
                                    if (!isGroup) return sock.sendMessage(from, { text: '❌ Command hii ni ya group tu!' })
                                    const meta = await sock.groupMetadata(from)
                                    const admins = meta.participants.filter(p => p.admin).map(p => p.id)
                                    if (!admins.includes(sender)) return sock.sendMessage(from, { text: '❌ Wewe sio admin!' })
                                    if (!admins.includes(sock.user.id)) return sock.sendMessage(from, { text: '❌ Nifanye admin kwanza!' })
