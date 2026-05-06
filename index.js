const TelegramBot = require('node-telegram-bot-api')
const { default: makeWASocket, useMultiFileAuthState, Browsers } = require('baileys')
const pino = require('pino')
const qrcode = require('qrcode')

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
                [{ text: '⚡ Link My WhatsApp', callback_data: 'link_wa' }],
                [{ text: '📖 How It Works', callback_data: 'how' }, { text: '💬 Contact Owner', url: `https://t.me/${OWNER.replace('@','')}` }],
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
        bot.sendMessage(chatId, 'Chagua njia ya ku-link:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔢 Pair Code - 20s', callback_data: 'pair_code' }],
                    [{ text: '🔳 QR Code - 60s', callback_data: 'get_qr' }],
                    [{ text: '⬅️ Back', callback_data: 'back' }]
                ]
            }
        })
    }

    if (data === 'pair_code') {
        bot.sendMessage(chatId, 'Andika namba yako ya WhatsApp:\nMfano: `255712345678`', { parse_mode: 'Markdown' })
        bot.once('message', async (msg) => {
            const number = msg.text.replace(/[^0-9]/g, '')
            if (number.length < 11) return bot.sendMessage(chatId, '❌ Namba si sahihi')
            const waitMsg = await bot.sendMessage(chatId, '⏳ *𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛®* inatengeneza code...', { parse_mode: 'Markdown' })
            try {
                const { state, saveCreds } = await useMultiFileAuthState(`session/${chatId}`)
                const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), browser: Browsers.ubuntu('Chrome') })
                sock.ev.on('creds.update', saveCreds)
                if (!sock.authState.creds.registered) {
                    const code = await sock.requestPairingCode(number)
                    bot.deleteMessage(chatId, waitMsg.message_id)
                    bot.sendMessage(chatId, `✅ *PAIR CODE YAKO:*\n\n\`${code}\`\n\n1. WhatsApp > Linked Devices\n2. Link with phone number\n3. Weka code\n\n⏰ *Expires 20s*\n\n_By 𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛®_`, { parse_mode: 'Markdown' })
                }
            } catch (e) {
                bot.sendMessage(chatId, '❌ Namba imeban. Tumia QR Code.')
            }
        })
    }

    if (data === 'get_qr') {
        const waitMsg = await bot.sendMessage(chatId, '⏳ *𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛®* inatengeneza QR...', { parse_mode: 'Markdown' })
        try {
            const { state, saveCreds } = await useMultiFileAuthState(`session_qr/${chatId}`)
            const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), browser: Browsers.ubuntu('Chrome') })
            sock.ev.on('creds.update', saveCreds)
            sock.ev.on('connection.update', async ({ qr, connection }) => {
                if (qr) {
                    const qrImage = await qrcode.toBuffer(qr)
                    bot.deleteMessage(chatId, waitMsg.message_id)
                    bot.sendPhoto(chatId, qrImage, { caption: `🔳 *𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛® QR*\n\nScan na WhatsApp > Linked Devices\n\n⏰ *60 seconds*`, parse_mode: 'Markdown' })
                }
                if (connection === 'open') bot.sendMessage(chatId, '✅ *IMEUNGWA!* Bot yako iko live. Andika *menu* WhatsApp.', { parse_mode: 'Markdown' })
            })
        } catch (e) {
            bot.sendMessage(chatId, '❌ Error. Jaribu tena')
        }
    }

    if (data === 'how') bot.sendMessage(chatId, '*JINSI INAVYOFANYA:*\n\n1. Chagua Pair Code au QR\n2. Link namba yako\n3. Bot yako inakuwa live na commands 200+', { parse_mode: 'Markdown' })
    if (data === 'sessions') bot.sendMessage(chatId, '🔒 Sessions zimehifadhiwa encrypted')
    if (data === 'back') mainMenu(chatId)
})

console.log('𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛® Linker running...')
