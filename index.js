const TelegramBot = require('node-telegram-bot-api')
const { default: makeWASocket, useMultiFileAuthState, Browsers, fetchLatestBaileysVersion } = require('baileys')
const pino = require('pino')
const qrcode = require('qrcode')
const express = require('express')

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
// FUTA HII LINE: bot.setWebHook(`${URL}/bot${TOKEN}`) 

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
│ ✅ Trusted by hundreds of users
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
            const { state, saveCreds } = await useMultiFileAuthState(`session_qr/${chatId}`)
            const { version } = await fetchLatestBaileysVersion()
            
            const sock = makeWASocket({ 
                version,
                auth: state, 
                logger: pino({ level: 'silent' }), 
                browser: Browsers.macOS('Desktop'),
                printQRInTerminal: false,
                syncFullHistory: false,
                markOnlineOnConnect: false,
                generateHighQualityLinkPreview: true
            })
            
            let sentQR = false
            
            sock.ev.on('creds.update', saveCreds)
            
            sock.ev.on('connection.update', async (update) => {
                const { qr, connection, lastDisconnect } = update
                
                if (qr && !sentQR) {
                    sentQR = true
                    const qrImage = await qrcode.toBuffer(qr)
                    await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {})
                    await bot.sendPhoto(chatId, qrImage, { 
                        caption: `🔳 *𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛® QR*\n\n1. WhatsApp > Linked Devices\n2. Link a Device\n3. Scan this QR\n\n⏰ *60 seconds*`, 
                        parse_mode: 'Markdown' 
                    })
                }
                
                if (connection === 'open') {
                    await bot.sendMessage(chatId, '✅ *CONNECTED!* Your bot is live. Type *menu* in WhatsApp.', { parse_mode: 'Markdown' })
                    await sock.end()
                }
                
                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode
                    console.log('Disconnect:', statusCode)
                    
                    if (statusCode === 401 || statusCode === 403) {
                        await bot.sendMessage(chatId, '❌ Session expired. Tap QR Code again.')
                    } else if (statusCode === 515) {
                        await bot.sendMessage(chatId, '❌ Restart required. Tap QR Code again.')
                    } else {
                        await bot.sendMessage(chatId, '❌ Connection closed. Try QR again in 10s.')
                    }
                    await sock.end()
                }
            })
            
        } catch (e) {
            console.log('QR ERROR:', e)
            bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {})
            bot.sendMessage(chatId, '❌ Error generating QR. Try again in 10 seconds')
        }
    }

    if (data === 'how') {
        bot.sendMessage(chatId, '*HOW IT WORKS:*\n\n1. Tap QR Code\n2. Scan with WhatsApp > Linked Devices\n3. Your bot goes live with 200+ commands', { parse_mode: 'Markdown' })
    }
    
    if (data === 'sessions') {
        bot.sendMessage(chatId, '🔒 Sessions are stored encrypted')
    }
    
    if (data === 'back') {
        mainMenu(chatId)
    }
})

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection:', reason)
})

process.once('SIGINT', () => bot.close())
process.once('SIGTERM', () => bot.close())
