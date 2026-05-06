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

// Hifadhi socket zote hapa ili zisiende
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
│ ✅ 8+ Active Commands
│
│ ⬇️ Choose what you want to do below 👇
│
└─❰ 𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛 © 2026 ❱`

    const ownerLink = `https://t.me/${OWNER.replace('@', '')}`

    const opts = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '⚡ Link My WhatsApp', callback_data: 'link_wa' }],
                [{ text: '📖 How It Works', callback_data: 'how' }, { text: '💬 Contact Owner', url: ownerLink }],
                [{ text: '📱 My Sessions', callback_data: 'sessions' }, { text: '🔳 Get QR Code', callback_data: 'get_qr' }],
                [{ text: '🌐 Website', url: 'https://github.com/kandala20' }, { text: '👨‍💻 GitHub', url: 'https://github.com/kandala20' }]
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

    if (data === 'link_wa') {
        bot.sendMessage(chatId, 'Choose a linking method:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔳 QR Code - 60s', callback_data: 'get_qr' }],
                    [{ text: '⬅️ Back', callback_data: 'back' }]
                ]
            }
        })
    }

    if (data === 'get_qr') {
        const waitMsg = await bot.sendMessage(chatId, '⏳ *𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛®* generating QR...', { parse_mode: 'Markdown' })

        try {
            // Kama alikuwa na bot zamani, imfungie
            if (global.activeSocks[chatId]) {
                await global.activeSocks[chatId].end()
                delete global.activeSocks[chatId]
            }

            const sessionPath = `session_qr/${chatId}`
            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true })
            }

            const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
            const { version } = await fetchLatestBaileysVersion()

            const sock = makeWASocket({
                version,
                auth: state,
                logger: pino({ level: 'silent' }),
                browser: Browsers.windows('Chrome'),
                printQRInTerminal: false,
                syncFullHistory: false,
                markOnlineOnConnect: false,
                keepAliveIntervalMs: 30000,
                connectTimeoutMs: 60000
            })

            let sentQR = false
            sock.ev.on('creds.update', saveCreds)

            sock.ev.on('connection.update', async (update) => {
                const { qr, connection, lastDisconnect } = update

                if (qr &&!sentQR) {
                    sentQR = true
                    const qrImage = await qrcode.toBuffer(qr)
                    await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {})
                    await bot.sendPhoto(chatId, qrImage, {
                        caption: `🔳 *𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛® QR*\n\n1. WhatsApp > Linked Devices\n2. Link a Device\n3. Scan this QR\n\n⏰ *60 seconds haraka*`,
                        parse_mode: 'Markdown'
                    })
                }

                if (connection === 'open') {
                    global.activeSocks[chatId] = sock
                    await bot.sendMessage(chatId, '✅ *CONNECTED!* Bot yako iko live. Type *menu* WhatsApp.', { parse_mode: 'Markdown' })

                    // COMMAND HANDLER START
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

                            // 1. MENU
                            if (text.match(/^\*?menu\*?$/i)) {
                                await sock.sendMessage(from, {
                                    text: `┌─❰ 𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛® ❱\n│\n│ Hello *${pushname}* 👋\n│\n│ *📋 COMMANDS:*\n│ 1. *ping* - Speed test\n│ 2. *owner* - Owner info\n│ 3. *info* - Bot info\n│ 4. *ai text* - Ask AI\n│\n│ *📱 GROUP ONLY:*\n│ 5. *groupinfo* - Group info\n│ 6. *tagall* - Tag everyone\n│ 7. *hidetag text* - Hidden tag\n│ 8. *kick @user* - Remove user\n│\n└─❰ 8 Commands Active ❱`,
                                    mentions: [sender]
                                })
                            }

                            // 2. PING + RECORD
                            else if (text.match(/^\*?ping\*?$/i)) {
                                const start = Date.now()
                                await sock.sendPresenceUpdate('recording', from)
                                await new Promise(r => setTimeout(r, 1000))
                                const end = Date.now()
                                await sock.sendMessage(from, { text: `🏓 *Pong!*\n\nSpeed: *${end - start}ms*\nStatus: Online ✅\nMode: ${isGroup? 'Group' : 'Private'}` })
                            }

                            // 3. OWNER
                            else if (text.match(/^\*?owner\*?$/i)) {
                                await sock.sendMessage(from, { text: `*𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛® OWNER*\n\n👨‍💻 @KandalaDev\n🌐 github.com/kandala20\n\nPowered by Baileys 2026` })
                            }

                            // 4. INFO
                            else if (text.match(/^\*?info\*?$/i)) {
                                await sock.sendMessage(from, { text: `*𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛® BOT*\n\n📊 Version: 2.0.0\n⚡ Baileys: Latest\n🔒 Mode: ${isGroup? 'Group' : 'Private'}\n📅 Year: 2026\n👤 User: ${pushname}` })
                            }

                            // 5. GROUPINFO
                            else if (text.match(/^\*?groupinfo\*?$/i)) {
                                if (!isGroup) return sock.sendMessage(from, { text: '❌ Command hii ni ya group tu!' })
                                const meta = await sock.groupMetadata(from)
                                const admins = meta.participants.filter(p => p.admin).map(p => p.id)
                                await sock.sendMessage(from, {
                                    text: `*📊 GROUP INFO*\n\n*Name:* ${meta.subject}\n*Members:* ${meta.participants.length}\n*Admins:* ${admins.length}\n*Created:* ${new Date(meta.creation * 1000).toLocaleDateString()}`,
                                    mentions: admins
                                })
                            }

                            // 6. TAGALL
                            else if (text.match(/^\*?tagall\*?$/i)) {
                                if (!isGroup) return sock.sendMessage(from, { text: '❌ Command hii ni ya group tu!' })
                                const meta = await sock.groupMetadata(from)
                                const members = meta.participants.map(p => p.id)
                                let teks = `*📢 TAG ALL*\n\n*Group:* ${meta.subject}\n*Members:* ${members.length}\n*By:* @${sender.split('@')[0]}\n\n`
                                teks += members.map((v, i) => `${i + 1}. @${v.split('@')[0]}`).join('\n')
                                await sock.sendMessage(from, { text: teks, mentions: [...members, sender] })
                            }

                            // 7. HIDETAG
                            else if (text.toLowerCase().startsWith('*hidetag') || text.toLowerCase().startsWith('hidetag')) {
                                if (!isGroup) return sock.sendMessage(from, { text: '❌ Command hii ni ya group tu!' })
                                const hidetagText = text.replace(/^\*?hidetag\*?/i, '').trim()
                                if (!hidetagText) return sock.sendMessage(from, { text: '*USAGE:* *hidetag your message*' })
                                const meta = await sock.groupMetadata(from)
                                const members = meta.participants.map(p => p.id)
                                await sock.sendPresenceUpdate('recording', from)
                                await sock.sendMessage(from, { text: hidetagText, mentions: members })
                            }

                            // 8. KICK
                            else if (text.toLowerCase().startsWith('*kick') || text.toLowerCase().startsWith('kick')) {
                                if (!isGroup) return sock.sendMessage(from, { text: '❌ Command hii ni ya group tu!' })
                                const meta = await sock.groupMetadata(from)
                                const admins = meta.participants.filter(p => p.admin).map(p => p.id)
                                if (!admins.includes(sender)) return sock.sendMessage(from, { text: '❌ Wewe sio admin!' })
                                if (!admins.includes(sock.user.id)) return sock.sendMessage(from, { text: '❌ Nifanye admin kwanza!' })
                                const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
                                if (!mentioned?.length) return sock.sendMessage(from, { text: '*USAGE:* *kick @user*' })
                                await sock.groupParticipantsUpdate(from, mentioned, 'remove')
                                await sock.sendMessage(from, { text: `✅ @${mentioned[0].split('@')[0]} amekuwa kicked`, mentions: mentioned })
                            }

                            // 9. AI
                            else if (text.toLowerCase().startsWith('*ai') || text.toLowerCase().startsWith('ai')) {
                                const query = text.replace(/^\*?ai\*?/i, '').trim()
                                if (!query) return sock.sendMessage(from, { text: '*AI USAGE:*\n\n*ai your question*' })
                                await sock.sendMessage(from, { text: `*𝗞𝗔𝗡𝗗𝗔𝗟𝗔 AI®*\n\nQ: ${query}\n\nA: Unganisha API ya AI hapa mkuu 😅` })
                            }

                            await sock.sendPresenceUpdate('paused', from)
                        }
                    })
                    // COMMAND HANDLER END - USIWEKE sock.end() HAPA
                }

                if (connection === 'close') {
                    delete global.activeSocks[chatId]
                    const statusCode = lastDisconnect?.error?.output?.statusCode
                    if (statusCode === 401 || statusCode === 403) {
                        await bot.sendMessage(chatId, '❌ Session expired. Tap QR Code again.')
                    } else {
                        await bot.sendMessage(chatId, '❌ Connection closed. Tap QR Code tena.')
                    }
                }
            })

        } catch (e) {
            console.log('QR ERROR:', e)
            bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {})
            bot.sendMessage(chatId, '❌ Error generating QR. Try again')
        }
    }

    if (data === 'how') {
        bot.sendMessage(chatId, '*HOW IT WORKS:*\n\n1. Tap QR Code\n2. Scan with WhatsApp\n3. Bot goes live\n4. Type *menu* in WhatsApp', { parse_mode: 'Markdown' })
    }

    if (data === 'sessions') {
        const activeCount = Object.keys(global.activeSocks).length
        bot.sendMessage(chatId, `🔒 Active sessions: ${activeCount}`)
    }

    if (data === 'back') {
        mainMenu(chatId)
    }
})

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection:', reason)
})

process.once('SIGINT', () => {
    Object.values(global.activeSocks).forEach(s => s.end())
    bot.close()
})
process.once('SIGTERM', () => {
    Object.values(global.activeSocks).forEach(s => s.end())
    bot.close()
})
