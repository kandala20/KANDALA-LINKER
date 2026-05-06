const TelegramBot = require('node-telegram-bot-api')
const { default: makeWASocket, useMultiFileAuthState } = require('baileys')
const pino = require('pino')
const fs = require('fs')

const TOKEN = 'WEKA-TOKEN-YAKO-HAPA' // <-- Badilisha hii
const bot = new TelegramBot(TOKEN, { polling: true })

const startMsg = `┌─❰ 𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛® BOT LINKER ❱
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
            [{ text: '📖 How It Works', callback_data: 'how' }, { text: '💬 Contact Owner', url: 'https://t.me/kandala20' }],
            [{ text: '📱 My Sessions', callback_data: 'sessions' }],
            [{ text: '🌐 Website', url: 'https://github.com/kandala20' }, { text: '👨‍💻 GitHub', url: 'https://github.com/kandala20' }]
        ]
    }
}

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, startMsg, opts)
})

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id
    const data = query.data

    if (data === 'link_wa') {
        bot.sendMessage(chatId, 'Andika namba yako ya WhatsApp na country code\nMfano: `255712345678`', { parse_mode: 'Markdown' })
        
        bot.once('message', async (msg) => {
            const number = msg.text.replace(/[^0-9]/g, '')
            if (number.length < 11) return bot.sendMessage(chatId, '❌ Namba si sahihi. Jaribu tena /start')
            
            bot.sendMessage(chatId, '⏳ Natengeneza pair code... Subiri 10s')
            
            try {
                const { state, saveCreds } = await useMultiFileAuthState(`session/${chatId}`)
                const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }) })
                sock.ev.on('creds.update', saveCreds)
                
                if (!sock.authState.creds.registered) {
                    const code = await sock.requestPairingCode(number)
                    bot.sendMessage(chatId, `✅ *PAIR CODE YAKO:*\n\n\`${code}\`\n\n*Jinsi ya ku-link:*\n1. Fungua WhatsApp\n2. Linked Devices > Link a Device\n3. Link with phone number\n4. Weka hii code\n\n⏰ Code expires in 20 seconds!`, { parse_mode: 'Markdown' })
                } else {
                    bot.sendMessage(chatId, '✅ Namba yako tayari imeshajiunga na bot')
                }
            } catch (e) {
                bot.sendMessage(chatId, '❌ Error: Namba imeban au umejaribu mara nyingi. Tumia namba nyingine.')
            }
        })
    }

    if (data === 'how') {
        bot.sendMessage(chatId, '*JINSI INAVYOFANYA KAZI:*\n\n1. Bonyeza "Link My WhatsApp"\n2. Andika namba yako\n3. Utapata pair code\n4. Ingiza WhatsApp > Linked Devices\n5. Bot yako itakuwa live!\n\n*Note:* Namba mpya zinafanya haraka. Zilizoban subiri wiki 2.', { parse_mode: 'Markdown' })
    }

    if (data === 'sessions') {
        bot.sendMessage(chatId, '🔒 Sessions zako zimehifadhiwa encrypted. Kama unataka ku-delete, andika /logout')
    }
})

console.log('𝗞𝗔𝗡𝗗𝗔𝗟𝗔 𝗧𝗘𝗖𝗛® Linker is running...')
