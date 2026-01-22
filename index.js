const { Client, EmbedBuilder, PermissionsBitField, ButtonBuilder, AttachmentBuilder, ActionRowBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits, Embed, ReactionType } = require("discord.js");
const db = require("pro.db");
const fs = require("fs");
const path = require('path');
const paths = "./Data/TicketData.json";
const pointsFile = path.join(__dirname, './Data/Points_Staff.json');
const privateSPath = './Data/privateS.json';
const cron = require('node-cron');
const ms = require("ms");
const channels = require('./Configs/channels.js');
const settings = require("./Configs/settings");
const roles = require("./Configs/roles");
const discordTranscripts = require('discord-html-transcripts');

const client = new Client({
    intents: [131071]
});

client.once("ready", () => {
    console.log("Logged in as", client.user.tag);
    checkPrivateRooms();
});

const moamen = '945387142434144256';

process.on('unhandledRejection', async (reason, promise) => {
    try {
        const moamenUser = await client.users.fetch(moamen);
        const errorMessage = `🚨 Unhandled Rejection: ${reason}\n\n📌 Stack Trace:\n${reason.stack || 'No stack trace available'}`;
        await moamenUser.send(errorMessage);
    } catch (err) {
        console.error('Failed to send DM:', err);
    }
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', async (err) => {
    try {
        const moamenUser = await client.users.fetch(moamen);
        const errorMessage = `🔥 Uncaught Exception: ${err.message}\n\n📌 Stack Trace:\n${err.stack}`;
        await moamenUser.send(errorMessage);
    } catch (error) {
        console.error('Failed to send DM:', error);
    }
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

const generateHtmlPage = async (channel) => {
    const fileName = 'transcript.html';
    const transcript = await discordTranscripts.createTranscript(channel, {
        limit: -1,
        returnType: 'string',
        filename: fileName,
        saveImages: true,
        poweredBy: false,
        ssr: false,
    });
    return transcript;
};

module.exports = {
    generateHtmlPage,
};

const warnsFile = path.join(__dirname, './Data/Warns.json');

function readJSON(filePath) {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}


async function checkPrivateRooms() {
    if (!fs.existsSync(privateSPath)) return;
    let privateSData = JSON.parse(fs.readFileSync(privateSPath, 'utf8'));

    for (const userId in privateSData) {
        let roomData = privateSData[userId];
        if (roomData.expiresAt <= Date.now()) {
            const user = await client.users.fetch(userId).catch(() => null);
            const room = await client.channels.fetch(roomData.roomId).catch(() => null);

            if (user) {
                await user.send(`❌ **انتهت مدة الروم الخاص بك. يرجى فتح تذكرة دعم فني للتجديد.**`);
            }

            if (room) {
                try {
                    await room.permissionOverwrites.edit(userId, { SendMessages: false });

                    if (roomData.isOpen) {
                        privateSData[userId].isOpen = false;
                        fs.writeFileSync(privateSPath, JSON.stringify(privateSData, null, 4));
                    }
                } catch (error) {
                    console.error(`فشل في تعديل صلاحيات الروم: ${error}`);
                }
            }
        }
    }
}

client.login(settings.Token);
//----------------------------------------------------\\

let ticketData = { SupportCount: 0 };
if (fs.existsSync(paths)) {
    ticketData = JSON.parse(fs.readFileSync(paths));
} else {
    fs.writeFileSync(paths, JSON.stringify(ticketData, null, 2));
}

//-----------------------------------------------------\\
function parseAmount(input) {
    const suffixes = { k: 1e3, m: 1e6 };
    const match = input.match(/^([\d.]+)([km]?)$/i);

    if (!match) return null;

    const number = parseFloat(match[1]);
    const suffix = match[2].toLowerCase();

    if (suffixes.hasOwnProperty(suffix)) {
        return number * suffixes[suffix];
    }

    return number;
}

function calculateTax(amount) {
    return Math.floor(amount * (20 / 19) + 1);
}

function calculateBrokerPercentage(amount) {
    return Math.floor((5 / 100) * amount);
}

client.on('messageCreate', async (message) => {
    if (message.content.startsWith(settings.prefix + "tax")) {
        const args = message.content.split(' ').slice(1).join(' ');
        if (!args) return;

        let amount = parseAmount(args);
        if (!amount) return message.reply("يرجى تقديم مبلغ صالح.");

        let tax = calculateTax(amount);
        let wasitTax = calculateTax(tax);
        let brokerTaxWithoutPercentage = calculateTax(amount + wasitTax);
        let brokerTaxWithPercentage = calculateTax(brokerTaxWithoutPercentage);
        let brokerPercentage = calculateBrokerPercentage(amount);
        let transferWithoutTax = calculateTax(amount - brokerPercentage);
        let transferWithTax = calculateTax(transferWithoutTax);
        const args2 = parseInt(args)

        const guild = message.guild;
        const embed = new EmbedBuilder()
            .setColor(settings.EmbedColor)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true, size: 512 }) })
            .setTimestamp()
            .addFields(
                { name: "> **السعر بدون ضرائب :**", value: `**\`${amount}\`**` },
                { name: "> **السعر مع ضرائب :**", value: `**\`${tax}\`**` },
                { name: "> **ضرائب الوسيط بدون نسبة :**", value: `**\`${brokerTaxWithoutPercentage}\`**` },
                { name: "> **ضرائب الوسيط مع نسبة :**", value: `**\`${brokerTaxWithPercentage}\`**` },
                { name: "> **نسبة الوسيط :**", value: `**\`${brokerPercentage}\`**` },
                { name: "> **تحويل بدون ضرائب :**", value: `**\`${args2 - (args2 * 0.05)}\`**` }
            )

        await message.reply({ embeds: [embed] });
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id === channels.Public.tax) {
        const args = message.content;
        if (!args) return;

        let amount = parseAmount(args);
        if (!amount) return message.reply("يرجى تقديم مبلغ صالح.");

        let tax = calculateTax(amount);
        let wasitTax = calculateTax(tax);
        let brokerTaxWithoutPercentage = calculateTax(amount + wasitTax);
        let brokerTaxWithPercentage = calculateTax(brokerTaxWithoutPercentage);
        let brokerPercentage = calculateBrokerPercentage(amount);
        let transferWithoutTax = calculateTax(amount - brokerPercentage);
        let transferWithTax = calculateTax(transferWithoutTax);
        const args2 = parseInt(args)

        const guild = message.guild;
        const embed = new EmbedBuilder()
            .setColor(settings.EmbedColor)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true, size: 512 }) })
            .setTimestamp()
            .addFields(
                { name: "> **المبلغ بدون الضرائب :**", value: `**\`${amount}\`**` },
                { name: "> **المبلغ مع الضرائب :**", value: `**\`${tax}\`**` },
                { name: "> **ضرائب الوسيط بدون نسبة :**", value: `**\`${brokerTaxWithoutPercentage}\`**` },
                { name: "> **ضرائب الوسيط مع نسبة :**", value: `**\`${brokerTaxWithPercentage}\`**` },
                { name: "> **نسبة الوسيط :**", value: `**\`${brokerPercentage}\`**` },
                { name: "> **تحويل بدون ضرائب :**", value: `**\`${args2 - (args2 * 0.05)}\`**` }
            )

        await message.reply({ embeds: [embed] });
        await message.channel.send({ content: settings.Pic.Line });
    }
});
client.on('messageCreate', async (message) => {
    if (message.channel.id === channels.Public.feedback) {
        if (message.author.bot) return;

        const msg = message.content;
        const user = message.author;
        const guild = message.guild;

        await message.delete();

        const embed = new EmbedBuilder()
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true, size: 512 }) })
            .setTitle('شكرا لرأيك يعسل 💙')
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .setColor(settings.EmbedColor)
            .setDescription(`**- ${user}\n- FeedBack : ${msg}**`)
            .setTimestamp()
            .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true, size: 512 }) });

        await message.channel.send({ embeds: [embed] });
        await message.channel.send({ content: settings.Pic.Line });
    }
});
client.on('messageCreate', async (message) => {
    if (message.content.startsWith(settings.prefix + 'come')) {
        if (!message.member.roles.cache.has(roles.Admins.DiscordStaff)) return;

        const mentionOrID = message.content.split(/\s+/)[1];
        const targetMember = message.mentions.members.first() || message.guild.members.cache.get(mentionOrID);

        if (!targetMember) {
            return message.reply('منشن شخص أو حط الإيدي 😶');
        }

        const user = message.author;
        const guild = message.guild;

        const embed = new EmbedBuilder()
            .setAuthor({ name: targetMember.user.username, iconURL: targetMember.user.displayAvatarURL({ dynamic: true, size: 512 }) })
            .setTitle('استدعاء عضو')
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .setColor(settings.EmbedColor)
            .setDescription(`**تم استدعاء العضو بنجاح: ${targetMember}**`)
            .setTimestamp()
            .setFooter({ text: `Request by: ${user.username}`, iconURL: user.displayAvatarURL({ dynamic: true, size: 512 }) });

        const msg = await message.reply({ embeds: [embed] });

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('اضغط هنا')
                .setURL(`https://discord.com/channels/${message.guildId}/${message.channelId}/${msg.id}`)
                .setStyle(ButtonStyle.Link)
        );

        try {
            await targetMember.send({
                content: `**مرحبا : ${targetMember}.

يرجى التوجه  إلى <#${message.channel.id}> في أقرب وقت

المستدعي : ${message.author}

رسالة الاستدعاء : https://discord.com/channels/${message.guildId}/${message.channelId}/${msg.id}**`, components: [buttons]
            })
            await targetMember.send({ content: settings.Pic.Line });
        } catch (err) {
            console.error('فشل إرسال الرسالة للعضو:', err);
            message.reply('ما قدرت أرسل رسالة خاصة للعضو. ممكن يكون موقف الرسائل الخاصة. 😕');
        }
    }
});
client.on('messageCreate', async message => {
    if (message.channel.id == channels.Public.sugg) {
        if (message.author.bot) return
        await message.delete();

        const user = message.author;
        const embed = new EmbedBuilder()
            .setTitle('اقتراح جديد')
            .setColor(settings.EmbedColor)
            .setDescription(`\`\`\`${message.content}\`\`\``)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setFooter({ text: `By ${user.username}`, iconURL: user.displayAvatarURL({ dynamic: true, size: 512 }) })
            .setTimestamp();

        const T = await message.channel.send({ content: `**- اقتراح من : ${message.author}**`, embeds: [embed] })
        await message.channel.send({ content: settings.Pic.Line })
        await T.react(`👍`)
        await T.react(`❌`)

    }
});
const server1 = settings.ServerInfo.serverID;

client.on('messageCreate', message => {
    if (message.guildId !== server1) return;

    // أمر "شفر"
    if (message.content === 'شفر') {
        if (!message.member.roles.cache.has(roles.Admins.DiscordStaff)) return;
        message.delete();
        message.channel.send(`** يجب تشفير حرف من الكلمات الاتية :
   [ "حساب","بيع","شراء","شوب","متجر,"ديسكورد","نصاب","سعر","متوفر","بوست","نيترو" ]**`);
    }

    // أمر "تفضل"
    if (message.content === 'تفضل') {
        if (!message.member.roles.cache.has(roles.Admins.DiscordStaff)) return;
        message.reply(`** تفضل معك الاداري ( ${message.author} ) من طاقم الدعم الفني الخاص بـ سيرفر \`${message.guild.name}\` , كيف اقدر اساعدك؟**`);
    }

    // أمر "حول @الشخص المبلغ"
    if (message.content.startsWith('حول')) {
        const args = message.content.split(' ');
        const mention = message.mentions.users.first();
        const amount = parseInt(args[args.length - 1], 10);

        if (!mention || isNaN(amount)) {
            return message.reply('يرجى كتابة الأمر بشكل صحيح: حول @الشخص المبلغ');
        }

        let المبلع = amount;

        if (args.some(arg => arg.includes('k'))) {
            المبلع *= 1000;
        } else if (args.some(arg => arg.includes('m'))) {
            المبلع *= 1000000;
        } else if (args.some(arg => arg.includes('t'))) {
            المبلع *= 1000000000;
        }

        const tax = Math.ceil(المبلع * 0.05);
        const finalAmount = المبلع + tax + 27;
        message.delete()
        message.channel.send(`**#credit ${settings.BankID} ${finalAmount}\n${mention}\nاي تحويل خارج التكت او تحويل لشخص اخر لن يتم الاعتراف به**`);
    }

    // أمر "شعار"
    if (message.content === 'شعار') {
        const guild = message.guild;
        if (!message.member.roles.cache.has(roles.Admins.DiscordStaff)) return;
        message.delete();
        message.channel.send(`**الشعار الوحيد لسيرفرات ${guild.name} :𝐓𝐈 | Name**`);
    }

    // أمر "خمول"
    if (message.content === 'خمول') {
        if (!message.member.roles.cache.has(roles.Admins.DiscordStaff)) return;
        message.delete()
        message.channel.send(`**في حال عدم التواجد خلال 5 دقائق سيتم اغلاق التذكرة**`)
    }

    // أمر "قيم"
    if (message.content === 'قيم') {
        if (!message.member.roles.cache.has(roles.Admins.DiscordStaff)) return;
        message.delete();
        message.channel.send(`**كان معك الأداري ( ${message.author} ) من طاقم الدعم الفني الخاص بـ سيرفر \`${message.guild.name}\`, فضلا وليس أمرا قم بتقييمي في روم <#${channels.Public.feedback}>**`);
    }
    // أمر "o'"
    if (message.content === "o'") {
        if (!message.member.roles.cache.has(roles.Admins.DiscordStaff)) return;
        message.delete();
        message.channel.send(settings.Pic.Line);
    }
    // أمر "خط"
    if (message.content === 'خط') {
        if (!message.member.roles.cache.has(roles.Admins.DiscordStaff)) return;
        message.delete();
        message.channel.send(settings.Pic.Line);
    }
});
client.on('messageCreate', message => {
    if (message.content.includes('has transferred')) {
        if (message.author.id !== settings.ServerInfo.Probot) return;
        message.channel.send(settings.Pic.Line)
    }
});
client.on('messageCreate', async message => {
    if (message.author.bot) return
    if (message.content.startsWith(settings.prefix + 'setup-tashfer')) {
        if (!message.member.roles.cache.has(roles.Admins.DiscordLeader)) return

        const guild = message.guild;
        const embed = new EmbedBuilder()
            .setTitle("تشفير" + guild.name)
            .setDescription("**لتشفير مشنورك يرجى ضغط الزر ادناه ووضع المنشور وسوف يتم تشفيره**")
            .setColor(settings.EmbedColor)
            .setImage(settings.Pic.tashfer)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true, size: 512 }) })
            .setTimestamp();

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('Tashfeer')
                .setLabel('شفر منشورك الان')
                .setStyle(ButtonStyle.Secondary),
        )

        await message.delete()
        await message.channel.send({ embeds: [embed], components: [buttons] })


    }
});

const wordReplacements = {
    "متجر": "متـgـر",
    "حساب": "7ـساب",
    "بيع": "بـيـ3",
    "شراء": "شـrـراء",
    "شوب": "شـ9ب",
    "ديسكورد": "ديسـkورد",
    "سعر": "سـ3ـر",
    "متوفر": "متـ9فر",
    "بوست": "بـ9ست",
    "نيترو": "نيـtـرو",
    "شوب": "شـ9ب",
    "توكنات": "تـ9ـكنات ",
    "كريديت": "كـrيديت",
    "كردت": "كـrدت",
};

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    const { customId } = interaction;

    if (customId == 'Tashfeer') {
        const TashfeerModal = new ModalBuilder()
            .setCustomId('TashfeerModal')
            .setTitle('شفر منشورك الان');
        const ThePost = new TextInputBuilder()
            .setCustomId('ThePost')
            .setLabel("منشورك")
            .setPlaceholder('اكتب منشورك هنا')
            .setStyle(TextInputStyle.Paragraph);
        const firstActionRow = new ActionRowBuilder().addComponents(ThePost);
        TashfeerModal.addComponents(firstActionRow);

        await interaction.showModal(TashfeerModal);
    } else if (customId == 'TashfeerModal') {
        const originalPost = interaction.fields.getTextInputValue(`ThePost`);

        const modifiedPost = originalPost.replace(
            new RegExp(Object.keys(wordReplacements).join('|'), 'gi'),
            match => wordReplacements[match.toLowerCase()] || match
        );
        await interaction.reply({ content: '**تم تشفير منشورك وارسلته لك بالخاص**', ephemeral: true })
        await interaction.user.send({ content: `- منشورك بعد التشفير :\n${modifiedPost}` });
    }
});
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.content.startsWith(settings.prefix + 'setup-order')) {
        if (!message.member.roles.cache.has(roles.Admins.DiscordLeader)) return;

        const guild = message.guild;
        const embed = new EmbedBuilder()
            .setTitle('يمكنك طلب ماتريد من هنا')
            .setDescription(`**قوانين الطلبات :

1- ممنوع طلب منتجات 18+.
2- ممنوع طلب أعضاء أو بارتنر.
3- ممنوع طلب طرق نيترو وكريديت.
4- ممنوع طلب أشياء في أماكن خطأ مثل: (تطلب نيترو في روم برمجيات أو تصاميم).
5- ممنوع بيع أي شيء.**`)
            .setImage(settings.Pic.Orders)
            .setColor(settings.EmbedColor)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true, size: 512 }) })
            .setTimestamp();

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('orders')
            .setPlaceholder('اختر من هنا')
            .addOptions([
                {
                    label: 'طلب منتج',
                    value: 'mntj',
                    emoji: '🎮',
                },
                {
                    label: 'طلب تصميم',
                    value: 'tasmin',
                    emoji: '✨',
                },
                {
                    label: 'طلب برمجيات',
                    value: 'program',
                    emoji: '💻',
                },
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await message.delete();
        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;

    const { customId, values } = interaction;

    if (customId === 'orders') {
        let modalTitle, placeholderText;

        if (values[0] === 'mntj') {
            modalTitle = 'طلب منتج';
            placeholderText = 'صف المنتج الذي تريده بشكل مفصل.';
        } else if (values[0] === 'tasmin') {
            modalTitle = 'طلب تصميم';
            placeholderText = 'صف التصميم الذي تريده بالتفصيل.';
        } else if (values[0] === 'program') {
            modalTitle = 'طلب برمجيات';
            placeholderText = 'صف الشيء الذي تريده.';
        } else {
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId(`order_${values[0]}`)
            .setTitle(modalTitle);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('description')
            .setLabel('وصف الطلب')
            .setPlaceholder(placeholderText)
            .setStyle(TextInputStyle.Paragraph);

        const actionRow = new ActionRowBuilder().addComponents(descriptionInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
    }
});
client.on("interactionCreate", async (interaction) => {
    if (interaction.isModalSubmit()) {
        const { customId } = interaction;
        if (!customId.startsWith('order_')) return;

        const orderType = customId.split('_')[1];
        const description = interaction.fields.getTextInputValue('description');
        const targetChannelId = channels.Orders[orderType];
        const targetChannel = interaction.guild.channels.cache.get(targetChannelId);

        if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
            return interaction.reply({
                content: '❌ لم يتم العثور على القناة المطلوبة لإرسال الطلب.',
                ephemeral: true,
            });
        }
        const user = interaction.user;
        const embed = new EmbedBuilder()
            .setTitle('طلب جديد')
            .setColor(settings.EmbedColor)
            .setDescription(`**- طلب جديد : \n \`\`\`${description}\`\`\`**`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setFooter({ text: user.username, iconURL: user.displayAvatarURL({ dynamic: true, size: 512 }) })
            .setTimestamp();

        const DeleteOrder = new ButtonBuilder()
            .setCustomId('deleteorder')
            .setLabel("DeleteOrder")
            .setEmoji("❌")
            .setStyle(ButtonStyle.Danger);

        const Deletes = new ActionRowBuilder().addComponents(DeleteOrder);

        await targetChannel.send({
            content: `**- صاحب الطلب : <@${interaction.user.id}>\n- <@&${roles.sellerRole}>**`,
            embeds: [embed],
            components: [Deletes],
        });
        await targetChannel.send({ content: settings.Pic.Line })

        await interaction.reply({
            content: '**- تم أرسال طلبك بنجاح ✅**',
            ephemeral: true,
        });
    }
});
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    const { customId } = interaction;

    if (customId === 'deleteorder') {
        if (!interaction.member.roles.cache.has(roles.Admins.DiscordStaff)) {
            return await interaction.reply({ content: '**- لاتحاول حبي 😒😒**', ephemeral: true })
        }
        await interaction.message.delete();
        await interaction.reply({ content: 'تم حذف الطلب بنجاح.', ephemeral: true });
    }
});
client.on('messageCreate', async message => {
    if (message.author.bot) return
    if (channels.AutoLine.includes(message.channel.id)) {
        await message.channel.send({ content: settings.Pic.Line })
    }
});
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (channels.ShopRooms.includes(message.channel.id)) {
        const رسالة_النصب = `**يجب عليك أخذ وسيط لحمايتك من النـsــب**
  https://discord.gg/wa`;
        try {
            const savedMessageID = await db.get('nsb');
            if (savedMessageID) {
                const channel = message.channel;
                const oldMessage = await channel.messages.fetch(savedMessageID).catch(() => null);
                if (oldMessage) await oldMessage.delete();
                await db.delete('nsb');
            }
            await message.channel.send(settings.Pic.Line)
            const newMessage = await message.channel.send({ content: رسالة_النصب });
            await db.set('nsb', newMessage.id);
        } catch (err) {
            console.error('Error handling message:', err);
        }
    }
});
client.on('messageCreate', async message => {
    if (message.author.bot) return
    if (message.content.startsWith(settings.prefix + 'setup-rules')) {
        if (!message.member.roles.cache.has(roles.Admins.DiscordLeader)) return

        const guild = message.guild;
        const embed = new EmbedBuilder()
            .setTitle(`قوانين ${guild.name}`)
            .setColor(settings.EmbedColor)
            .setImage(settings.Pic.Rules)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .setDescription(`**لرؤية قوانين السيرفر اختار قوانين السيرفر

لرؤية قوانين البائعين اختار قوانين البائعين

لرؤية قوانين الادارة اختار قونين الادارة**`)
            .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true, size: 512 }) })
            .setTimestamp();

        await message.delete()
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('rules_select')
            .setPlaceholder('حدد من هنا')
            .addOptions(
                {
                    label: "قوانين السيرفر",
                    value: "server_rules",
                },
                {
                    label: "قوانين البي3",
                    value: "seller_rules",
                },
                {
                    label: "قوانين الادارة",
                    value: "staff_rules",
                }
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);
        await message.channel.send({ embeds: [embed], components: [row] });
    }
})

client.on("interactionCreate", async (interaction) => {

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'rules_select') {
            const value = interaction.values[0];

            if (value === 'server_rules') {

                const server_rules = new EmbedBuilder()
                    .setColor(settings.EmbedColor)
                    .setDescription(`**__Server Rules・قوانين السيرفر__
                        
1 ・ يـمنع منعاً باتاً الإساءة الى السيرفر أو أعضاؤه ويجب الالتزام بالأخلاق والقيم العالية

2 ・ يجب عليك تبادل الأحترام - داخل السيرفر (أحترم تحترم)

3 ・ يـمنع طلب الكردت او التعويض او النيترو داخل السيرفر

4 ・ يـمنع التحدث بأي شكل من الاشكال عن أي موضوع من المواضيع التالية : (العنصرية ، الطائفية، الدين ، الشذوذ، الامور التي تتسبب بالنقاشات والمشاكل)

5 ・يجب عليك إتباع تعليمات الادارة والتعاون معهم وعدم مخالفتهم

6 ・ يمنع التلميح و الايحاء بأي شكل من الاشكال داخل الخادم

7・يمنع مشاركة امور خاصة لعضو داخل السيرفر (فضيحه) فذالك يعرضك الى الحظر من الخادم

8 ・ يمنع استخدام شات غير مخصص

9 ・ يمنع الدخول الى السيرفر بأفتار مسيء او اسم مسيء يعرضك الى الحظر الفوري

10 ・ يمنع طلب الرتب داخل السيرفر الرتب تُعطى لمن يستحقها ولاتطلب

11・ لـنا دخل بالخاص فقط في الامور التالية : (مشاركة روابط السيرفرات ، سرقة او نصب، مشاركة صور اباحية)

12 ・ لـيس لنا علاقة بأمور لاتخص السيرفر بأي شكل من الاشكال

13 ・ يمنع الحرق بجميع اشكاله بالشات العام يؤدي الى الاسكات

14 ・ يـمنع انتحال اداري او تشويه سمعته يؤدي الى الحظر الفوري من السيرفر

15 ・ يمنع ذكر اسامي سيرفرات اخرى داخل السيرفر

16・ يـمنع مشاركة الروابط داخل السيرفر بجميع اشكالها (باند دائم من السيرفر )

17 ・ يـمنع التشهير داخل السيرفر

18 ・ يـمنع التشبه بالنساء والعكس كذالك

19 ・ اللغات المسموح بها (العربية - الانجليزية ) يمنع استعمال اي لغة اخرى

20・ يمنع السب داخل السيرفر بجميع اشكال سؤاء كان شات او فويس

21 ・ جميع القوانين تنطبق على الرومات الصوتية كذالك

22 ・يـمنع ذكر كلمات التي تتسبب بمشاكل كـ ( عمك) والى أخره

23 ・ يـمنع طلب الصلاحيات الادارية داخل السيرفر

24 ・ تبادل الحسابات داخل السيرفر ممنوع منعاً باتا لضمان عدم النصب داخل السيرفر

25・ممنوع تمنشن اي اداري لسبب تافه منشنه بحال فيه تخريب او غيرها تحذير

26 • يمنع التبادل الغير امن بيجميع انواعه

27・عدم قرائتك لشروط السيرفر ليست بمسؤليتنا ويحق لأداري ماقبتك فور مخالفتك و وجودك بالخادم يدل على موافقتك على شروطه وقوانينه

28 ・ممنوع البيـ.ـع او الطلب بالشات

29 ・يرجى الاتزام التشفير حتا في الشات العام وكل الرومات

تحياتي : \`${interaction.guild.name}\`**`)
                await interaction.reply({ embeds: [server_rules], ephemeral: true })
            }

            if (value === 'seller_rules') {
                const userRoles = interaction.member.roles.cache;
                const hasAccess = userRoles.some(role => roles.RolesSellers.includes(role.id));
                if (!hasAccess) {
                    return interaction.reply({ content: '**انت لست بائع لرؤية القوانين هذه**', ephemeral: true });
                }

                const seller_rules = new EmbedBuilder()
                    .setColor(settings.EmbedColor)
                    .setDescription(`**__Sellers Rules・قوانين البائعين__

ممنوع بيع كريدت باي شكل من الاشكال | سحب رتبة
ممنوع بيع عملة حقيقية/رصيد مقابل كريدت | سحب رتبة
ممنوع اي شي +18 | سحب رتبة
عدم قبول وسيط | سحب رتبة
ممنوع نشر اي طرق نيترو او طرق كردت | سحب رتبة
ممنوع اي بطاقة قوقل بلاي عليها سياسيات | سحب رتبة
ممنوع منشن افريون ما عدا روم vip | سحب رتبة
ممنوع بيع طريقة او منتج يكون عبر دخول للسيرفر ، مجرد ما قلت له ادخل السيرفر | سحب رتبة
ممنوع الاستهبال/طلب "نشر اشياء ما تخص البيع" بالرومات | سحب رتبة
ممنوع نسخ منشور احد ثاني او تقول نفس الي فوقي | سحب رتبة
ممنوع بيع الادوات او البرامج سواء ايش كان نوعها | سحب رتبة
ممنوع تنشر اي ايميل و باس بالروم كنوع من الهدايا | سحب رتبة
مخالفة قوانين رتبتك | تحذير
ممنوع بيع الفيزات بجميع اشكالها | تحذير
ممنوع نشر منتجات برومات مختلفة , مثال : تصاميم بروم حسابات | تحذير
ترويج ل سيرفر ( نشر صورة فيها رابط سيرفر) او اي شي مشابه | سحب رتبه

الاشياء الجانبيه :
اي شي ماله روم خاص فيه يتنشر في روم اخرى
منتجات الديسكورد بجميع اشكالها فقط في روم ديس ، مخالفة ده الشي = تحذير
عدم التشفير ل الكلمات الممنوعة يؤدي الى حذف منشورك بشكل تلقائي او يدوي
لتشفير منشورك توجه لروم التشفير

تحياتي : \`${interaction.guild.name}\`**`)
                await interaction.reply({ embeds: [seller_rules], ephemeral: true })
            }

            if (value === 'staff_rules') {
                const userRoles = interaction.member.roles.cache;

                const hasStaffAccess = userRoles.has(roles.Admins.DiscordStaff);
                if (!hasStaffAccess) {
                    return interaction.reply({ content: '**انت لست اداري لرؤية القوانين هذه**', ephemeral: true });
                }
                const staff_rules = new EmbedBuilder()
                    .setColor(settings.EmbedColor)
                    .setDescription(`**__Staff Rules・قوانين الادارة__
                        
1- احترامك للجميع اعضاء - ادارة “ في الخاص او في السيرفر “ ، اذا تم السب عليك او عدم احترامك لا تقم بالسب او الرد عليه بالشتم لانه قد يعرضك للطرد من الادارة .
2- ازالة الشعار = فصل من الادارة بدون اي نقاش ، حتى لو لبضع ثواني .
3- يمنع منعا بات نشر السيرفرات في الخاص .
4- يمنع استغلال رتبك لمصالح شخصية .
5- يمنع اعطاء اي عضو - شخص معلومات ادارية .
6- اي اداري - عضو يخطأ لا تقوم بالتكلم باسلوب غير لائق .
7- التفاعل إجباري وليس اختياري “ اقل ساعات تفاعل 5 ساعات “ .
8- يمنع السبام ، يعرضك لطرد من اداره .
9- يمنع طلب ترقية - تلميح لترقية ، يعرضك لطرد من اداره .
10- يمنع استلام اكثر من تكتين إلا في حالة ضغط .
11- يمنع سحب على تكت اكثر من 5 دقايق .
12- يمنع التدخل في تكت إلا بهدف المساعده .
13- يمنع منشن اونر إلا في حالة الطوارئ .
14- يمنع عدم فتح المايك عندما يطلب منك فتحه .

تحياتي : \`${interaction.guild.name}\`**`)
                await interaction.reply({ embeds: [staff_rules], ephemeral: true })

            }
        }
    }
});
client.on("messageCreate", async (message) => {
    if (message.content.startsWith(settings.prefix + 'setup-prove')) {
        if (!message.member.roles.cache.has(roles.Admins.DiscordLeader)) return

        const guild = message.guild;
        const embed = new EmbedBuilder()
            .setTitle(message.guild.name + " | اثبت نفسك")
            .setDescription(`**- اضغط على الزر الي تحت لتضهر لك الرومات
- نتمنى لكم تجربة ممتعة 💙🌹**`)
            .setColor(settings.EmbedColor)
            .setImage(settings.Pic.Prove)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true, size: 512 }) })
            .setTimestamp();

        const prove = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prove')
                .setLabel('أثـبـت نـفـسـك')
                .setEmoji("✅")
                .setStyle(ButtonStyle.Secondary),
        )

        await message.delete()
        await message.channel.send({ embeds: [embed], components: [prove] })
    }
});
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'prove') {
        const userId = interaction.user.id;
        const roleId = roles.Public.verifyrole;
        const member = await interaction.guild.members.fetch(userId);
        const role = interaction.guild.roles.cache.get(roleId);

        if (!role) {
            return interaction.reply({ content: '❌ لم يتم العثور على الرتبة.', ephemeral: true });
        }

        if (member.roles.cache.has(roleId)) {
            await member.roles.remove(role);
            await interaction.reply({ content: '**تمت إزالة توثيقك ❌**', ephemeral: true });
        } else {
            await member.roles.add(role);
            await interaction.reply({ content: '**تم توثيقك بنجاح ✅**', ephemeral: true });
        }
    }
});
client.on('messageCreate', async (message) => {
    if (message.content.startsWith(settings.prefix + "setup-info")) {
        if (!message.member.roles.cache.has(roles.Admins.DiscordLeader)) return
        message.delete();
        const guild = message.guild;
        const embed = new EmbedBuilder()
            .setTitle('المعلومات')
            .setDescription(`**- لرؤية معلومات رتب البي3 اختار رتب البي3

- لرؤية معلومات الرومات الخاصة اختار الرومات الخاصة*

- لرؤية معلومات الاعلانات اختار الاعلانات

- لرؤية معلومات المنشورات المميزة اختار المنشورات المميزة**`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true, size: 512 }) })
            .setImage(settings.Pic.Info)
            .setColor(settings.EmbedColor);

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('information')
            .setPlaceholder('اختر من هنا')
            .addOptions(
                {
                    label: "رتب البي3",
                    value: "sellroles",
                    emoji: '📋',
                },
                {
                    label: "الرومات الخاصة",
                    value: "romat5asa",
                    emoji: '📋',
                },
                {
                    label: "الأعلانات",
                    value: "i3lanat",
                    emoji: '📋',
                },
                {
                    label: "المنشورات المميزة",
                    value: "mmezh",
                    emoji: '📋',
                }
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        message.channel.send({ embeds: [embed], components: [row] });
    }
});
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId === 'information') {
        const selectedValue = interaction.values[0];

        if (selectedValue === 'sellroles') {
            const sellroles = new EmbedBuilder()
                .setColor(settings.EmbedColor)
                .setDescription(`
📌 ملاحظات وتنويهات:

- الرتب النادرة ليست متوفرة دائمًا.
- التحويل يتم فقط إلى ( <@${settings.BankID}> ).
- تنبيه: نحن غير مسؤولين عن أي تحويل لحساب غير المذكور أعلاه.

**✨ تحياتنا، إدارة \`${interaction.guild.name}\` ✨**`)

            await interaction.reply({ embeds: [sellroles], ephemeral: true })
        }
        if (selectedValue === 'romat5asa') {
            const romat5asa = new EmbedBuilder()
                .setColor(settings.EmbedColor)
                .setDescription(`🎉 - معلومات الرومات الخاصة - 🎉

💰 سعر الروم: 250,000 💰

✨ - المميزات - ✨

- روم خاص باسمك يمكنك تغييره في أي وقت.
- نشر تلقائي كل ساعة مع صلاحية رفع الصور ومنشن @here.

📋 - الملاحظات - 📋

- يُسمح بالطلب والبيع داخل الروم الخاص.
- القوانين الخاصة بالرومات متوافقة مع قوانين البائعين.
- عند مخالفة القوانين سيتم إنهاء الروم، وفي حال التكرار سيتم حذفه نهائيًا.

🚨 - التحويل لـ : ( <@${settings.BankID}> ) - 🚨
🔴 تنبيه: إذا تم التحويل لأي حساب آخر غير المذكور أعلاه، لن يتم تسليمك الروم، ونحن غير مسؤولين عن ذلك.

**🌟 تحياتنا لكم، إدارة \`${interaction.guild.name}\` 🌟**`)

            await interaction.reply({ embeds: [romat5asa], ephemeral: true })
        }
        if (selectedValue === 'i3lanat') {
            const i3lanat = new EmbedBuilder()
                .setColor(settings.EmbedColor)
                .setDescription(`**:star2: Ads Informations・معلومات الإعلانات  :star2:

:moneybag: - أنواع الإعلانات وأسعارها - :moneybag:

- No Mentions | إعلان بدون منشن
\`100k credit\`

- Here | إعلان مع منشن هير
\`150k credit \`

- Everyone | إعلان مع منشن ايفري ون
\`250k credit\`

- Ads Gifts | إعلان بروم هدايا مع جيفواي (لمدة 3 أيام)
\`500k credit القيف اوي عليك\`

- Private Channel With Giveaway | روم خاص مع قيف أواي (لمدة 3 أيام)
\`750k credit القيف اوي عليك\`

- First Channel With Giveaway | أول روم بالسيرفر مع قيف أواي (لمدة أسبوع)
>  قيف اوي علينا نص مليون
\`1,500,000\`**

**:clipboard: - ملاحظات مهمة - :clipboard:**
**
- :no_entry_sign: الإعلانات المخالفة: في حال نشر محتوى +18 سيتم حذف إعلانك.

- :hourglass_flowing_sand: مدة الإعلانات: جميع إعلانات الرومات الخاصة تشمل منشن Everyone لمدة ثلاث أيام.

- :arrows_counterclockwise: إعادة السحب (Reroll): مسموح إعادة السحب مرة واحدة إذا لم يلتزم الفائزون بالشروط.

- :no_entry_sign: عدم ضمان الأعضاء: لا يوجد أي ضمان لدخول الأعضاء عبر الإعلان.

- :x: الإعلانات المخالفة: إذا ورد إلينا بلاغان موثقان عن النصب من سيرفرك، سيتم حذف الإعلان بدون تعويض.**
**:clock3: تعديل الإعلان: مسموح تعديل الإعلان خلال أول 5 دقائق من نشره فقط، بعدها لن يتم التعديل.**

**:no_entry_sign: الإعلانات الممنوعة:

- إعلانات بيع أو شراء الكردت.

- الإعلانات التي تخص نظام الـReward.

- الإعلانات التي تحتوي على رابط إضافة بوت.**
**:moneybag: التحويل لـ : ( <@${settings.BankID}> )

:red_circle: تنبيه: إذا تم التحويل لأي حساب غير المذكور أعلاه، لن يتم تسليم الإعلان، ونحن غير مسؤولين عن ذلك.

:sparkles: تحياتنا، إدارة \`${interaction.guild.name}\` :sparkles:**`)

            await interaction.reply({ embeds: [i3lanat], ephemeral: true });
        }
        if (selectedValue === 'mmezh') {
            const mmezh = new EmbedBuilder()
                .setColor(settings.EmbedColor)
                .setDescription(`**:star2: Special Publications Informations・معلومات المنشورات المميزة :star2:**

- :small_blue_diamond: Mention Here | منشن هير: 150,000 Credits
- :small_blue_diamond: Mention Everyone | منشن ايفريون: 300,000 Credits

:clipboard: - ملاحظات مهمة - :clipboard:
**
- :no_entry_sign: ممنوع بيع أو طلب الكردت بأي شكل من الأشكال.
- :no_entry_sign: ممنوع بيع أو طلب عملة حقيقية (مثل الدولار) مقابل كردت أو العكس.
- :no_entry_sign: ممنوع بيع أو طلب رصيد (مثل فودافون كاش، آسيا، سوا، وغيرها).
- :no_entry_sign: ممنوع بيع أو طلب أي محتوى +18.
- :no_entry_sign: ممنوع بيع أو طلب أدوات أو برامج.
- :no_entry_sign: ممنوع بيع طرق معروفة ومتوفرة على اليوتيوب.
- :no_entry_sign: ممنوع بيع أو طلب طرق كردت/نيترو بجميع أشكالها.
- :no_entry_sign: ممنوع طلب أعضاء أو شراكات (Partners).
- :no_entry_sign: ممنوع بيع أو طلب فيزات أو أي وسائل مالية مشابهة.
**
:warning: لا يمكن تعديل المنشور بعد إتمام النشر.

**:moneybag: التحويل لـ : ( <@${settings.BankID}> )**

:red_circle: تنبيه: إذا تم التحويل لأي حساب غير المذكور أعلاه، لن يتم تسليم المنشور، ونحن غير مسؤولين عن ذلك.

**:sparkles: تحياتنا، إدارة \`${interaction.guild.name}\` :sparkles:**`)
            await interaction.reply({ embeds: [mmezh], ephemeral: true });
        }
    }
});
client.on("messageCreate", async (message) => {
    if (message.content.startsWith(settings.prefix + 'setup-tickets')) {
        if (!message.member.roles.cache.has(roles.Admins.DiscordLeader)) return;

        await message.delete();
        const guild = message.guild;
        const embed = new EmbedBuilder()
            .setAuthor({ name: 'الـتـذاكـر', iconURL: guild.iconURL({ dynamic: true, size: 512 }) })
            .setDescription(`**- اذا عندك سؤال او استفسار افتح تكت دعم فني
- اذا حابب تشتري رتبة-اعلان-رومخاص والخ..افتح تكت دعم فني
- اذا احد نصب عليك افتح تكت مشهر
- اذا عندك شكوى على طاقم الدعم الفني افتح تكت شكوى

\`مـــلاحـــضـــة :\`
- تفتح تكت شكوى وتشتكي على عضو = مخالفة
- تفتح تكت مالها دخل بالي تريده مثل تفتح تكت شكوى وتشتري = مخالفة
- تفتح تكت وتستهبل = مخالفة
- تفتح تكت وتمنشن = مخالفة
- تفتح تكت وتسب = باند**`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true, size: 512 }) })
            .setImage(settings.Pic.Ticket)
            .setColor(settings.EmbedColor);

        const open = new ButtonBuilder()
            .setCustomId('open_ticket')
            .setLabel("Open Ticket")
            .setEmoji("📩")
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(open);

        message.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId === 'open_ticket') {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_select')
            .setPlaceholder('اختر نوع التذكرة')
            .addOptions(
                { label: "الدعم الفني", value: "الدعم الفني" },
                { label: "شكوى على إداري", value: "شكوى على إداري" }
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
            components: [row],
            ephemeral: true
        });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId === 'ticket_select') {
        if (interaction.values[0] === "الدعم الفني") {
            const modal = new ModalBuilder()
                .setTitle('الدعم الفني')
                .setCustomId('support');

            const reason = new TextInputBuilder()
                .setCustomId('reason')
                .setLabel('ماسبب فتح التذكرة؟ اكتب بالتفصيل')
                .setPlaceholder("................... اكتب هنا")
                .setMinLength(5)
                .setRequired(true)
                .setStyle(TextInputStyle.Paragraph);

            modal.addComponents(new ActionRowBuilder().addComponents(reason));
            interaction.showModal(modal);
        } else if (interaction.values[0] === "شكوى على إداري") {
            const modal = new ModalBuilder()
                .setTitle('شكوى على إداري')
                .setCustomId('report_ticket');

            const adminIdInput = new TextInputBuilder()
                .setCustomId('admin_id')
                .setLabel('اكتب ايدي الإداري المشتكى عليه')
                .setPlaceholder("مثال: 123456789")
                .setMinLength(5)
                .setRequired(true)
                .setStyle(TextInputStyle.Short);

            const complaintInput = new TextInputBuilder()
                .setCustomId('complaint')
                .setLabel('اكتب تفاصيل الشكوى')
                .setPlaceholder("................... اكتب هنا")
                .setMinLength(5)
                .setRequired(true)
                .setStyle(TextInputStyle.Paragraph);

            modal.addComponents(
                new ActionRowBuilder().addComponents(adminIdInput),
                new ActionRowBuilder().addComponents(complaintInput)
            );

            interaction.showModal(modal);
        }
    }
});
client.on('interactionCreate', async (interaction) => {
    if (interaction.isModalSubmit()) {
        const userId = interaction.user.id;

        const existingSupportTicket = Object.keys(ticketData).find(ticket => ticketData[ticket].userId === userId && ticket.startsWith('support-'));
        const existingReportTicket = Object.keys(ticketData).find(ticket => ticketData[ticket].userId === userId && ticket.startsWith('report-'));

        if (interaction.customId === 'support') {
            if (existingSupportTicket) {
                await interaction.reply({ content: `**أنت تمتلك تذكرة دعم بالفعل: <#${ticketData[existingSupportTicket].channelId}>**`, ephemeral: true });
                return;
            }

            const reason = interaction.fields.getTextInputValue('reason');
            const ticketCount = String(ticketData.SupportCount + 1).padStart(4, '0');
            const ticketChannelName = `support-${ticketCount}`;

            const ticketChannel = await interaction.guild.channels.create({
                name: ticketChannelName,
                type: ChannelType.GuildText,
                parent: channels.Ticket.SupportCategory,
                permissionOverwrites: [
                    { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: userId, allow: [PermissionFlagsBits.ViewChannel] },
                    { id: roles.Admins.DiscordStaff, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ],
            });

           ticketData[ticketChannel.id] = {

    userId: interaction.user.id,

    createdAt: Date.now()

};

 
            ticketData.SupportCount++;
            fs.writeFileSync(paths, JSON.stringify(ticketData, null, 2));

            const closeButton = new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel("Close")
                .setEmoji("🔒")
                .setStyle(ButtonStyle.Danger);

                const claimButton = new ButtonBuilder()
                .setCustomId('claim_ticket')
                .setLabel('Claim')
                .setEmoji("📌")
                .setStyle(ButtonStyle.Secondary);

                const BuyButton = new ButtonBuilder()
                .setCustomId('buy_button')
                .setLabel('Buy')
                .setEmoji("🛒")
                .setStyle(ButtonStyle.Secondary);

            const embed = new EmbedBuilder()
                .setTitle('تذكرة الدعم الفني')
                .setColor(settings.EmbedColor)
                .setDescription(`**- يرجى الانتظار لحل مشكلتك الرجاء دون إزعاج. - للشراء اضغط على زر الشراء الي تحت**`)
                .addFields({ name: 'السبب', value: `**\`\`\`${reason}\`\`\`**` });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('admin_helper')
                .setPlaceholder('مساعد الإداري')
                .addOptions(
                    { label: "تغيير اسم التذكرة", value: "change_name" },
                    { label: "إضافة مستخدم للتذكرة", value: "add_user" },
                    { label: "إزالة مستخدم من التذكرة", value: "remove_user" },
                    { label: "فحص التحذيرات", value: "check_warns" },
                    { label: "طلب ادارة عليا", value: "highsupport" }
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);
            const btn = new ActionRowBuilder().addComponents(closeButton, claimButton, BuyButton);

            await ticketChannel.send({
                content: `**<@${userId}> - <@&${roles.Admins.DiscordStaff}>**`,
                embeds: [embed],
                components: [row, btn]
            });

            await interaction.reply({ content: `**تم إنشاء تذكرتك : <#${ticketChannel.id}>**`, ephemeral: true });

        } else if (interaction.customId === 'report_ticket') {
            if (existingReportTicket) {
                await interaction.reply({ content: `**أنت تمتلك تذكرة شكوى بالفعل: <#${ticketData[existingReportTicket].channelId}>**`, ephemeral: true });
                return;
            }

            const adminId = interaction.fields.getTextInputValue('admin_id');
            const complaint = interaction.fields.getTextInputValue('complaint');

            const ticketCount = String(ticketData.Report + 1).padStart(4, '0');
            const ticketChannelName = `report-${ticketCount}`;

            const ticketChannel = await interaction.guild.channels.create({
                name: ticketChannelName,
                type: ChannelType.GuildText,
                parent: channels.Ticket.SupportCategory,
                permissionOverwrites: [
                    { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: userId, allow: [PermissionFlagsBits.ViewChannel] },
                    { id: roles.Admins.DiscordLeader, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ],
            });

            ticketData[ticketChannel.id] = { 
                
userId: interaction.user.id, channelId: ticketChannel.id
                                           };
            ticketData.Report++;
            fs.writeFileSync(paths, JSON.stringify(ticketData, null, 2));

            const closeButton = new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel("Close")
                .setEmoji("🔒")
                .setStyle(ButtonStyle.Danger);

            const embed = new EmbedBuilder()
                .setTitle('تذكرة شكوى')
                .setColor(settings.EmbedColor)
                .setDescription('**مرحبًا بك في تذكرة الشكوى الخاصة بك، أرسل الدلائل وانتظر الرد بدون منشن.**')
                .addFields(
                    { name: 'الإداري المشتكى عليه', value: `**\`\`\`${adminId}\`\`\`**` },
                    { name: 'تفاصيل الشكوى', value: `**\`\`\`${complaint}\`\`\`**` }
                );
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('admin_helper')
                .setPlaceholder('مساعد الإداري')
                .addOptions(
                    { label: "إضافة مستخدم للتذكرة", value: "add_user" },
                    { label: "إزالة مستخدم من التذكرة", value: "remove_user" },
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await ticketChannel.send({
                content: `**<@${userId}> - <@&${roles.Admins.DiscordLeader}>**`,
                embeds: [embed],
                components: [row, new ActionRowBuilder().addComponents(closeButton)]
            });

            await interaction.reply({ content: `**تم إنشاء تذكرتك: <#${ticketChannel.id}>**`, ephemeral: true });
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId === 'admin_helper') {
        const selectedValue = interaction.values[0];

        if (!interaction.member.roles.cache.has(roles.Admins.DiscordStaff)) {
            return interaction.reply({ content: "ليس لديك الصلاحية للوصول إلى هذه الخيارات.", ephemeral: true });
        }

        if (interaction.message.embeds[0].title === 'تذكرة الدعم الفني') {
            if (selectedValue === 'add_user') {
                const modal = new ModalBuilder()
                    .setTitle('إضافة عضو للتكت')
                    .setCustomId('add_member_modal');
                const userIdInput = new TextInputBuilder()
                    .setCustomId('user_id')
                    .setLabel('أدخل ايدي الشخص لإضافته')
                    .setPlaceholder("مثال: 123456789")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short);

                modal.addComponents(new ActionRowBuilder().addComponents(userIdInput));
                interaction.showModal(modal);

            } else if (selectedValue === 'remove_user') {
                const modal = new ModalBuilder()
                    .setTitle('إزالة عضو من التكت')
                    .setCustomId('remove_member_modal');
                const userIdInput = new TextInputBuilder()
                    .setCustomId('user_id')
                    .setLabel('أدخل ايدي الشخص لإزالته')
                    .setPlaceholder("مثال: 123456789")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short);

                modal.addComponents(new ActionRowBuilder().addComponents(userIdInput));
                interaction.showModal(modal);

            } else if (selectedValue === 'change_name') {
                const modal = new ModalBuilder()
                    .setTitle('تغيير اسم التكت')
                    .setCustomId('change_name_modal');
                const nameInput = new TextInputBuilder()
                    .setCustomId('ticket_name')
                    .setLabel('أدخل الاسم الجديد للتكت')
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short);

                modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                interaction.showModal(modal);

            } else if (selectedValue === 'highsupport') {
                await interaction.reply({
                    content: `<@&${roles.Admins.DiscordLeader}>
By: ${interaction.user}`,
                });
            } else if (selectedValue === 'check_warns') {
                const modal = new ModalBuilder()
                    .setTitle('التحقق من التحذيرات')
                    .setCustomId('check_warns_modal');
                const userIdInput = new TextInputBuilder()
                    .setCustomId('warns_user_id')
                    .setLabel('أدخل ايدي الشخص للتحقق من التحذيرات')
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short);

                modal.addComponents(new ActionRowBuilder().addComponents(userIdInput));
                interaction.showModal(modal);
            }
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'add_member_modal') {
        const userId = interaction.fields.getTextInputValue('user_id');
        const ticketChannel = interaction.channel;
        const member = await interaction.guild.members.fetch(userId);

        if (member) {
            ticketChannel.permissionOverwrites.edit(member, {
                [PermissionsBitField.Flags.ViewChannel]: true,
                [PermissionsBitField.Flags.SendMessages]: true,
            });
            await interaction.reply({ content: `تم إضافة <@${userId}> إلى التكت. ${interaction.user}` });
        } else {
            await interaction.reply({ content: "لم يتم العثور على العضو." });
        }

    } else if (interaction.customId === 'remove_member_modal') {
        const userId = interaction.fields.getTextInputValue('user_id');
        const ticketChannel = interaction.channel;
        const member = await interaction.guild.members.fetch(userId);

        if (member) {
            ticketChannel.permissionOverwrites.delete(member);
            await interaction.reply({ content: `تم إزالة <@${userId}> من التكت. ${interaction.user}` });
        } else {
            await interaction.reply({ content: "لم يتم العثور على العضو." });
        }

    } else if (interaction.customId === 'change_name_modal') {
        const newName = interaction.fields.getTextInputValue('ticket_name');
        const ticketChannel = interaction.channel;

        await ticketChannel.setName(newName);
        await interaction.reply({ content: `تم تغيير اسم التكت إلى ${newName}. ${interaction.user}` });

} else if (interaction.customId === 'check_warns_modal') {
    const userId = interaction.fields.getTextInputValue('warns_user_id');
    const warnsData = readJSON(warnsFile);
    const userWarns = warnsData.filter(warn => warn.userid === userId);
    const warnsList = userWarns.length ? userWarns.map(warn => `**سبب التحذير : \`\`\`${warn.reason}\`\`\`\nالمشرف الذي حذر البائع : <@${warn.staff}>\nقبل : ${warn.time}\n\nالمنشور : \`\`\`${warn.info}\`\`\`**`).join('\n') : 'لا توجد تحذيرات لهذا الشخص';

    const embed = new EmbedBuilder()
        .setDescription(warnsList)
        .setColor(settings.EmbedColor);

    await interaction.reply({ content: `**التحذيرات الخاصة بـ <@${userId}>**`, embeds: [embed] });
}
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId === 'close_ticket') {

        const close = new ButtonBuilder()
            .setCustomId('close')
            .setLabel("Close")
            .setStyle(ButtonStyle.Danger);

        const cancel = new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(close, cancel);

        await interaction.reply({
            content: 'Are you sure you would like to close this ticket?',
            components: [row]
        })
    }
});
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'close') {
        const ticketChannelId = interaction.channel.id;
        const ticketChannel = interaction.channel;
        const ticketName = ticketChannel.name;

        if (!channels.Log || !channels.Log.TicketLog) {
            console.error("TicketLog channel not found.");
            await interaction.reply({ content: "Error: TicketLog channel not found.", ephemeral: true });
            return;
        }

        

        const htmlPageContent = await generateHtmlPage(ticketChannel);

        if (ticketName) {
            const attachment = new AttachmentBuilder(Buffer.from(htmlPageContent), { name: `trans-${ticketName}.html` });

await interaction.deferReply({ ephemeral: true });
await interaction.editReply("سيتم حذف التذكرة خلال 5 ثواني...");

            try {
                const logChannel = interaction.guild.channels.cache.get(channels.Log.TicketLog);
                
if (logChannel) {
    const ticketOwner = ticketData[ticketChannelId]?.userId || "غير معروف";
    const claimedby = ticketData[ticketChannelId]?.claimedBy;
    const openedAtTimestamp = Math.floor(ticketChannel.createdTimestamp / 1000);
    const closedAtTimestamp = Math.floor(Date.now() / 1000);

    const fields = [
        { name: 'Opened By:', value: `<@${ticketOwner}>`, inline: true },
        { name: 'Closed By:', value: `<@${interaction.user.id}>`, inline: true }
    ];

    // إذا كان هناك Claimed By، نضيفه تحت Closed By مباشرة
    if (claimedby) {
        fields.push({ name: 'Claimed By:', value: `<@${claimedby}>`, inline: true });
    }

    // إضافة التواريخ بعد ذلك
    fields.push(
        { name: 'Opened At:', value: `<t:${openedAtTimestamp}>`, inline: true },
        { name: 'Closed At:', value: `<t:${closedAtTimestamp}>`, inline: true }
    );

    const embed = new EmbedBuilder()
        .setTitle('Ticket has been closed')
        .addFields(fields);

    await logChannel.send({
        content: `<@${ticketOwner}>`,
        embeds: [embed],
        files: attachment ? [attachment] : []
    });

    await logChannel.send({
        content: settings.Pic.Line
    });
}
                
if (ticketData[ticketChannelId]) {

            delete ticketData[ticketChannelId];

            fs.writeFileSync(paths, JSON.stringify(ticketData, null, 2));

        }
                setTimeout(() => {
                    ticketChannel.delete().catch(console.error);
                }, 5000);
            } catch (error) {
                console.error('Failed to send transcript:', error);
                await interaction.followUp({ content: 'فشل في إرسال الترانسكريبت، حاول مرة أخرى لاحقاً.', ephemeral: true });
            }
        } else {
            await interaction.reply({ content: 'Invalid ticket format.', ephemeral: true });
        }
    }


    if (interaction.customId === 'cancel') {
        await interaction.message.delete();
    }

    if (interaction.customId === 'claim_ticket') {
        const user = interaction.user;
        const member = await interaction.guild.members.fetch(user.id);
    
        if (!member.roles.cache.has(roles.Admins.DiscordStaff)) {
            return interaction.reply({ content: 'You don\'t have permissions', ephemeral: true });
        }
    
        
        const ticketChannel = interaction.channel;
        const ticketChannelId = interaction.channel.id;
        const ticketName = ticketChannel.name;
    
        if (!ticketData[ticketChannelId]) return;
        ticketData[ticketChannelId].claimedBy = user.id;
        fs.writeFileSync(paths, JSON.stringify(ticketData, null, 2));
    
        const rows = interaction.message.components.map(actionRow => {
            return new ActionRowBuilder().addComponents(
                actionRow.components.map(btn => {
                    if (btn.customId === interaction.customId) {
                        return new ButtonBuilder()
                            .setCustomId('unclaim')
                            .setLabel('Unclaim')
                            .setEmoji("📌")
                            .setStyle(ButtonStyle.Secondary);
                    }
                    return btn;
                })
            );
        });
    
        await interaction.update({ components: rows });
    
        const embedMessage = new EmbedBuilder()
            .setColor(settings.EmbedColor)
            .setDescription(`**Ticket Claimed By: <@${user.id}>.**`);
        await ticketChannel.send({ embeds: [embedMessage] });
    
        const DataPoints = readJSON(pointsFile);
        const adminData = DataPoints.find(entry => entry.userid === interaction.user.id);
        if (adminData) {
            adminData.points = (adminData.points || 0) + 1; // إضافة نقطة
        } else {
            DataPoints.push({ userid: interaction.user.id, points: 1 });
        }
        writeJSON(pointsFile, DataPoints);
    }
    
    if (interaction.customId === 'unclaim') {
        const user = interaction.user;
        const ticketChannelId = interaction.channel.id;
        const ticketChannel = interaction.channel;
        const ticketName = ticketChannel.name;
    
        if (!ticketData[ticketChannelId] || ticketData[ticketChannelId].claimedBy !== user.id) {
            return interaction.reply({ content: 'You are not the one who claimed this ticket.', ephemeral: true });
        }
    
        ticketData[ticketChannelId].claimedBy = null;
        fs.writeFileSync(paths, JSON.stringify(ticketData, null, 2));
    
        const rows = interaction.message.components.map(actionRow => {
            return new ActionRowBuilder().addComponents(
                actionRow.components.map(btn => {
                    if (btn.customId === interaction.customId) {
                        return new ButtonBuilder()
                            .setCustomId('claim_ticket')
                            .setLabel('Claim')
                            .setEmoji("📌")
                            .setStyle(ButtonStyle.Secondary);
                    }
                    return btn;
                })
            );
        });
    
        await interaction.update({ components: rows });
    
        const embedMessage = new EmbedBuilder()
            .setColor(settings.EmbedColor)
            .setDescription(`**Ticket Unclaimed By: <@${user.id}>.**`);
        await ticketChannel.send({ embeds: [embedMessage] });
    
        const DataPoints = readJSON(pointsFile);
        const adminData = DataPoints.find(entry => entry.userid === interaction.user.id);
        if (adminData) {
            adminData.points = (adminData.points || 0) - 1; 
        } else {
            DataPoints.push({ userid: interaction.user.id, points: -1 });
        }
        writeJSON(pointsFile, DataPoints);

    }

    if (interaction.customId === 'buy_button') {
        
    
        const guild = interaction.guild;
        const buyembed = new EmbedBuilder()
            .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true, size: 512 }) })
            .setDescription(`**- الرتب : شراء الرتب العامة او ازالة تحذيرات او نقل الرتب
- المنشورات المميزة : شراء منشور مميز
- الاعلانات : شراء اعلان لسيرفرك
- الرومات الخاصة : شراء روم خاص لنشر منتجاتك**`)
            .setColor(settings.EmbedColor)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true, size: 512 }) })
            .setTimestamp();
    
        const buy_select = new StringSelectMenuBuilder()
            .setCustomId('buy_select')
            .addOptions(
                {
                    label: "الرتب",
                    description: "لـ شراء الرتب العامة او ازالة تحذير او نقل رتب",
                    value: "roles_select",
                },
                {
                    label: "الأعلانات",
                    description: "لـ شراء اعلان لسيرفرك",
                    value: "ads_select",
                },
                {
                    label: "المنشورات المميزة",
                    description: "لـ شراء منشور مميز",
                    value: "post_select",
                },
                {
                    label: "الرومات الخاصة",
                    description: "لـ شراء روم خاص او تجديد روم خاص",
                    value: "private_select",
                },
            );
    
        const row = new ActionRowBuilder().addComponents(buy_select);
    
        await interaction.reply({ embeds: [buyembed], components: [row] });
    }
    
});
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId === 'buy_select') {
        const selectedValue = interaction.values[0];

        if (selectedValue === 'roles_select') {
            const roles = new StringSelectMenuBuilder()
                .setCustomId('roles')
                .addOptions(
                    {
                        label: "الرتب",
                        value: "rolee",
                    },
                    // {
                    //     label: "ازالة تحذير",
                    //     value: "warnremove",
                    // },
                    // {
                    //     label: "نقل رتب",
                    //     value: "roless",
                    // },
                )
            const btn = new ButtonBuilder()
                .setCustomId('back_button')
                .setLabel("الرجوع للقائمة الرئيسية")
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(btn);
            const row2 = new ActionRowBuilder().addComponents(roles);

            const guild = interaction.guild;
            const embeds1 = new EmbedBuilder()
                .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true, size: 512 }) })
                .setDescription(`**- اختر ماتريد من هذه القائمة**`)
                .setColor(settings.EmbedColor)
                .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
                .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true, size: 512 }) })
                .setTimestamp();

            await interaction.channel.send({
                embeds: [embeds1],
                components: [row2, row],
            });
            await interaction.message.delete();
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId === 'back_button') {
        const guild = interaction.guild;
        const backbtn = new EmbedBuilder()
            .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true, size: 512 }) })
            .setDescription(`**- الرتب : شراء الرتب العامة او ازالة تحذيرات او نقل الرتب
- المنشورات المميزة : شراء منشور مميز
- الاعلانات : شر اء اعلان لسيرفرك
- الرومات الخاصة : شراء روم خاص لنشر منتجاتك**`)
            .setColor(settings.EmbedColor)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true, size: 512 }) })
            .setTimestamp();

        const buy_select = new StringSelectMenuBuilder()
            .setCustomId('buy_select')
            .addOptions(
                {
                    label: "الرتب",
                    description: "لـ شراء الرتب العامةاو ازالة تحذير او نقل رتب",
                    value: "roles_select",
                },
                {
                    label: "الأعلانات",
                    description: "لـ شراء اعلان لسيرفرك",
                    value: "ads_select",
                },
                {
                    label: "المنشورات المميزة",
                    description: "لـ شراء منشور مميز",
                    value: "post_select",
                },
                {
                    label: "الرومات الخاصة",
                    description: "لـ شراء روم خاص او تجديد روم خاص",
                    value: "private_select",
                },
            );

        const row = new ActionRowBuilder().addComponents(buy_select);

        await interaction.channel.send({ embeds: [backbtn], components: [row] })
        await interaction.message.delete();
    }
});
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    const selectedValue = interaction.values[0];
    if (interaction.customId === 'roles') {
       
        if (selectedValue === 'rolee') {
            const embed = new EmbedBuilder()
                .setColor(settings.EmbedColor)
                .setTitle("لشراء رتب البيع الجميلة 🌾")
                .setDescription(`
📌 ملاحظات وتنويهات:

- الرتب النادرة ليست متوفرة دائمًا.
- التحويل يتم فقط إلى ( <@${settings.BankID}> ).
- تنبيه: نحن غير مسؤولين عن أي تحويل لحساب غير المذكور أعلاه.

**✨ تحياتنا، إدارة \`${interaction.guild.name}\` ✨**`)

            const ss = new StringSelectMenuBuilder()
                .setCustomId('roles_buy_select')
                .addOptions(
                    {
                        label: "Titan S",
                        value: "Titan S",
                    },
                    {
                        label: "Vanguard S",
                        value: "Vanguard S",
                    },
                    {
                        label: "Phoenix S",
                        value: "Phoenix S",
                    },
                    {
                        label: "Tech Smith S",
                        value: "Tech Smith S",
                    },
                    {
                        label: "Programing",
                        value: "Programing",
                    },
                    {
                        label: "Designs",
                        value: "Designs",
                    }
                );

            const row = new ActionRowBuilder().addComponents(ss);
            await interaction.message.delete()
            await interaction.channel.send({ content: `${interaction.user}`, embeds: [embed], components: [row] })
        }
    }
});



// ===== إعدادات =====
const SETTINGS = {
    BankID: '1438036495838609471', // حط الـ BankID الحقيقي
    ProbotID: '282859044593598464', // ID البوت اللي يستقبل التحويل
    NitroPrice: 175000
};

const STOCK_PATH = path.join(__dirname, 'stock.json');

function loadStock() {
    try {
        if (!fs.existsSync(STOCK_PATH)) fs.writeFileSync(STOCK_PATH, JSON.stringify([] , null, 2), 'utf8');
        return JSON.parse(fs.readFileSync(STOCK_PATH, 'utf8'));
    } catch (e) {
        console.error('Failed to load stock.json', e);
        return [];
    }
}

function saveStock(stockArray) {
    try { fs.writeFileSync(STOCK_PATH, JSON.stringify(stockArray, null, 2), 'utf8'); } 
    catch (e) { console.error('Failed to save stock.json', e); }
}

// رابط النيترو
const NITRO_LINKS = [
    "https://promos.discord.gg/Kxkf8PbFa5sjnbnNtBfmy8sh",
    "https://promos.discord.gg/eVCKtTn26tGjX5ztqkF5FYqu",
    "https://promos.discord.gg/MTyqE8wZwnR5UvtDekARFwAF",
    "https://promos.discord.gg/M5aEDUvHzng7aPmHWBUhSCbr",
    "https://promos.discord.gg/dkXQjB7JArXSVzydfcjue8Xt",
    "https://promos.discord.gg/N8Qc3GrB4kvm9PAyx88hEygd",
    "https://promos.discord.gg/hhYurSMx4Zt2eN5fRSyds8r7",
    "https://promos.discord.gg/NQG9X5JZy9p9a6xNbFhgBNtS",
    "https://promos.discord.gg/jjy2JH7NBrBhpEgDAkekqA3j",
    "https://promos.discord.gg/N3xuGhsUD7AePakwFmDQst2f",
    "https://promos.discord.gg/jbmqNAH2bU5mQV2F8etvFdHa",
    "https://promos.discord.gg/MyqasTfyWrfM2EqxtjtMwXcr",
    "https://promos.discord.gg/NJ8ejEaRFDAbkwBehxnkw9WP",
    "https://promos.discord.gg/gKemQ7Vc36zSj4SEZnWtGqSs",
    "https://promos.discord.gg/NE9EvteHUgqtcG9YGVuPxbuK",
    "https://promos.discord.gg/NM6Gjkv8Tn263XpDrgxGFEgw",
    "https://promos.discord.gg/N3K7ahz8dgpegTmF7MP2Mq4a",
    "https://promos.discord.gg/jHn9xDjSkR2QETTBeb3Qshfv",
    "https://promos.discord.gg/jR7Gp3JDsf6XZYT7YCngJbDh",
    "https://promos.discord.gg/MH2eWu7GC5gBUfUVuFDSzWeV",
    "https://promos.discord.gg/cbmTCZJkxbxzTXk2U9UZARjF",
    "https://promos.discord.gg/XxHeYWKUHHnazZpgDjQWzhXY",
    "https://promos.discord.gg/cbAgZkDkfQyQXhDZnWd5hMny",
    "https://promos.discord.gg/cxDTKjrVm2ktuzBXcHEaErTQ",
    "https://promos.discord.gg/Xrq4vRsp82dhyk2hsbcTPfPr",
    "https://promos.discord.gg/bbrnG2tC3nApWDG73CUZRZDC",
    "https://promos.discord.gg/c7QC9EKAJc2eExceDxwrMEep"
];

// ---------- listener ----------
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const stock = loadStock();

    // ----- أمر $buy nitro (count) -----
    if (message.content.startsWith('$buy nitro')) {
        const args = message.content.split(' ');
        const count = parseInt(args[2]);
        if (isNaN(count) || count < 1) return message.reply('ادخل كمية صحيحة.');

        const totalAmount = SETTINGS.NitroPrice * count;
        const tax = Math.ceil(totalAmount * 0.05);
        const finalAmount = totalAmount + tax + 27;

        // ارسال رسالة البنك
        const mention = `<@${message.author.id}>`;
        await message.delete().catch(() => {});
        await message.channel.send(`**#credit ${SETTINGS.BankID} ${finalAmount}\n${mention}\nاي تحويل خارج الروم او تحويل لشخص اخر لن يتم الاعتراف به**`);

        // متابعة البرو بوت
        const filter = m => 
            m.author.id === SETTINGS.ProbotID &&
            m.content.includes(SETTINGS.BankID) &&
            m.content.includes(totalAmount.toString());

        const collector = message.channel.createMessageCollector({ filter, time: 60000, max: 1 });
        collector.on('collect', async (m) => {
            let sentLinks = [];
            for (let i = 0; i < count; i++) {
                if (stock.length === 0) break;
                const index = Math.floor(Math.random() * stock.length);
                const link = stock.splice(index,1)[0]; // حذف من الستوك
                sentLinks.push(link);
                await message.author.send(`تم ارسال النيترو لك: ${link}`).catch(() => {});
            }
            saveStock(stock);
            message.channel.send(`تم ارسال ${sentLinks.length} نيتروهات للخاص.`);
        });
    }

    // ----- أمر $stock -----
    if (message.content === '$stock') {
        message.channel.send(`الستوك الحالي من النيترو: ${stock.length}`);
    }

  if (message.content === '$price') {
    message.channel.send(`السعر للنيترو الواحد هو: ${SETTINGS.NitroPrice}`);
}

});



client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId === 'roles_buy_select') {
        const selectedValue = interaction.values[0];
        const user = interaction.guild.members.cache.get(interaction.user.id);
        const role = interaction.guild.roles.cache.get(roles.roleid[selectedValue]);
        const sellerRole = interaction.guild.roles.cache.get(roles.sellerRole);

        if (user.roles.cache.has(role.id)) {
            const already = new EmbedBuilder()
                .setColor(settings.EmbedColor)
                .setDescription(`**- ❌ | انت تملك هذه الرتبة بالفعل!\n\n- <@&${roles.roleid[selectedValue]}>**`)
                .setThumbnail(interaction.guild.iconURL())
                .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

            const alreadybtn = new ButtonBuilder()
                .setCustomId('back_button')
                .setLabel("🔙 الرجوع للقائمة الرئيسية")
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(alreadybtn);

            return await interaction.message.edit({ embeds: [already], components: [row], });
        }

        const args = roles.price[selectedValue];

        let amount = parseAmount(args);

        const tax = calculateTax(amount);
        const wasitTax = calculateTax(tax);
        const brokerTaxWithoutPercentage = calculateTax(amount + wasitTax);
        const brokerTaxWithPercentage = calculateTax(brokerTaxWithoutPercentage);
        const brokerPercentage = calculateBrokerPercentage(amount);
        const transferWithoutTax = calculateTax(amount - brokerPercentage);
        const transferWithTax = calculateTax(transferWithoutTax);
        const args2 = parseInt(args)

        const buyrole = new EmbedBuilder()
            .setTitle(`عملية شراء رتبة : ${selectedValue}`)
            .setColor(settings.EmbedColor)
            .setDescription(`**لأكمال شراء رتبة : \`${selectedValue}\` يرجى تحويل \`${tax}\` الى <@${settings.BankID}>

\`- ملاحضة :\`
- التحويل بالضريبة فقط. لانتحمل مسؤولية التحويل بدون ضرائب
- التحويل للبنك فقط. لانتحمل مسؤولية التحويل لشخص اخر
- التحويل داخل التذكرة فقط. لانتحمل مسؤولية التحويل خارج التكت
\`\`\`#credit ${settings.BankID} ${tax}\`\`\`**`);

        await interaction.reply({ embeds: [buyrole] });
        await interaction.channel.send({ content: `#credit ${settings.BankID} ${tax}` });

        const channel = interaction.channel;
        const filter = (response) =>
            response.content.startsWith(`**:moneybag: | ${interaction.user.username}, has transferred \`$${roles.price[selectedValue]}\``) &&
            response.content.includes(settings.BankID) &&
            response.author.id === settings.ServerInfo.Probot &&
            response.content.includes(`${roles.price[selectedValue]}`);

        const collector = channel.createMessageCollector({ filter, time: 300000 });

        collector.on('collect', async (message) => {
            if (user.roles.cache.has(role.id)) return;

            await user.roles.add(role.id);
            await user.roles.add(sellerRole.id);

            const logChannel = interaction.guild.channels.cache.get(channels.Log.RolesLog);
            if (logChannel) {
                const alreadybtn = new ButtonBuilder()
                    .setCustomId('back_button')
                    .setLabel("🔙 الرجوع للقائمة الرئيسية")
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder().addComponents(alreadybtn);
                const embed = new EmbedBuilder()
                    .setTitle("💳 عملية شراء رتبة جديدة 💳")
                    .setColor(settings.EmbedColor)
                    .setThumbnail(interaction.guild.iconURL())
                    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                    .addFields(
                        { name: "👤 العميل", value: `<@${interaction.user.id}>`, inline: true },
                        { name: "🏅 نوع الرتبة", value: `<@&${role.id}>`, inline: true }
                    )
                    .setTimestamp();

                await logChannel.send({ content: `**- ${user}**`, embeds: [embed] });

                const embed1 = new EmbedBuilder()
                    .setTitle("✅ عملية شراء ناجحة")
                    .setColor(settings.EmbedColor)
                    .setThumbnail(interaction.guild.iconURL())
                    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                    .addFields(
                        { name: '🏅 نوع الرتبة', value: `<@&${role.id}>` }
                    )
                    .setTimestamp();

                await message.channel.send({ embeds: [embed1], components: [row] });
            }
        });

        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                const alreadybtn = new ButtonBuilder()
                    .setCustomId('back_button')
                    .setLabel("🔙 الرجوع للقائمة الرئيسية")
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder().addComponents(alreadybtn);
                const timeend = new EmbedBuilder()
                    .setTitle("❌ | انتهى الوقت")
                    .setColor(settings.EmbedColor)
                    .setDescription(`**❌ | أنتهى الوقت لاتحول اذا حولت نحنا غير مسؤولين**`)
                    .setThumbnail(interaction.guild.iconURL())
                    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                try {
                    await interaction.channel.send({ embeds: [timeend], components: [row] });
                } catch (error) {
                    return;
                }
            }
        });
    }
});
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId === 'buy_select') {
        const selectedValue = interaction.values[0];
        if (selectedValue === 'post_select') {
            const postem = new EmbedBuilder()
                .setColor(settings.EmbedColor)
                .setDescription(`**__Special Publications Informations・معلومات المنشورات المميزة__**

**<:__:1337071225696157728> Mention Here | منشن هير**
- 150,000 Credits

**<:__:1337071225696157728> Mention Everyone | منشن ايفريون**
- 300,000 Credits

**<:__:1337071225696157728> Note | ملاحضة :**

- ممنوع بيع كردت او طلب كردت
- ممنوع بيع او طلب عملة حقيقه مثل دولار مقابل كردت او العكس
- ممنوع طلب او بيع رصيد ( فودافون كاش , اسيا , سوا , الخ  )
- ممنوع طلب او بيع اي شي +18
- ممنوع طلب او بيع الادوات او البرامج
- ممنوع بيع طريقة تكون موجودة على اليوتيوب
- ممنوع طلب او بيع طرق كردت/نيترو  بجميع اشكالها
- ممنوع طلب اعضاء او بارتنر
- ممنوع طلب او بيع فيزات
- لا يمكنك تعديل المنشور بعد اتمام النشر 
- التحويل لـ : <@${settings.BankID}>
- اذا قمت بالتحويل لأحد غير الحساب المذكور أعلاه فلن يتم تسليمك و لن نتحمل المسؤولية`)

            const posttypeselect = new StringSelectMenuBuilder()
                .setCustomId('post_select')
                .setOptions(
                    {
                        label: 'منشن هير',
                        value: 'here',
                    },
                    {
                        label: 'منشن أيفري ون',
                        value: 'everyone',
                    }
                )
            const row = new ActionRowBuilder().addComponents(posttypeselect)
            await interaction.message.delete()
            await interaction.channel.send({ embeds: [postem], components: [row] })
        }
    }
});
//
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId === 'post_select') {
        const selectedValue = interaction.values[0];
        const user = interaction.guild.members.cache.get(interaction.user.id);

        const args = roles.price[selectedValue];

        let amount = parseAmount(args);

        const tax = calculateTax(amount);
        const wasitTax = calculateTax(tax);
        const brokerTaxWithoutPercentage = calculateTax(amount + wasitTax);
        const brokerTaxWithPercentage = calculateTax(brokerTaxWithoutPercentage);
        const brokerPercentage = calculateBrokerPercentage(amount);
        const transferWithoutTax = calculateTax(amount - brokerPercentage);
        const transferWithTax = calculateTax(transferWithoutTax);
        const args2 = parseInt(args)

        const buypost = new EmbedBuilder()
            .setTitle(`عملية شراء منشور : \`${selectedValue}\``)
            .setColor(settings.EmbedColor)
            .setDescription(`**لأكمال شراء منشور : \`${selectedValue}\` يرجى تحويل \`${tax}\` الى <@${settings.BankID}>

\`- ملاحضة :\`
- التحويل بالضريبة فقط. لانتحمل مسؤولية التحويل بدون ضرائب
- التحويل للبنك فقط. لانتحمل مسؤولية التحويل لشخص اخر
- التحويل داخل التذكرة فقط. لانتحمل مسؤولية التحويل خارج التكت
\`\`\`#credit ${settings.BankID} ${tax}\`\`\`**`);

        await interaction.reply({ embeds: [buypost] });
        await interaction.channel.send({ content: `#credit ${settings.BankID} ${tax}` });

        const channel = interaction.channel;
        const filter = (response) =>
            response.content.startsWith(`**:moneybag: | ${interaction.user.username}, has transferred \`$${roles.price[selectedValue]}\``) &&
            response.content.includes(settings.BankID) &&
            response.author.id === settings.ServerInfo.Probot &&
            response.content.includes(`${roles.price[selectedValue]}`);

        const collector = channel.createMessageCollector({ filter, time: 300000 });

        collector.on('collect', async (message) => {

            const logChannel = interaction.guild.channels.cache.get(channels.Log.PostLog);
            if (logChannel) {

                const postbtn = new ButtonBuilder()
                    .setCustomId(`post_${selectedValue}`)
                    .setLabel("أرسل المنشور")
                    .setStyle(ButtonStyle.Secondary)

                const row = new ActionRowBuilder().addComponents(postbtn);
                const embed = new EmbedBuilder()
                    .setTitle("💳 عملية شراء منشور مميز 💳")
                    .setColor(settings.EmbedColor)
                    .setThumbnail(interaction.guild.iconURL())
                    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                    .addFields(
                        { name: "👤 العميل", value: `<@${interaction.user.id}>`, inline: true },
                        { name: "🏅 نوع المنشور", value: `@${selectedValue}`, inline: true }
                    )
                    .setTimestamp();

                await logChannel.send({ content: `**- ${user}**`, embeds: [embed] });

                const embed1 = new EmbedBuilder()
                    .setTitle("✅ عملية شراء ناجحة")
                    .setColor(settings.EmbedColor)
                    .setThumbnail(interaction.guild.iconURL())
                    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                    .addFields(
                        { name: '🏅 نوع المنشور', value: `@${selectedValue}` }
                    )
                    .setTimestamp();

                await message.channel.send({ embeds: [embed1], components: [row] });
            }
        });

        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                const alreadybtn = new ButtonBuilder()
                    .setCustomId('back_button')
                    .setLabel("🔙 الرجوع للقائمة الرئيسية")
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder().addComponents(alreadybtn);
                const timeend = new EmbedBuilder()
                    .setTitle("❌ | انتهى الوقت")
                    .setColor(settings.EmbedColor)
                    .setDescription(`**❌ | أنتهى الوقت لاتحول اذا حولت نحنا غير مسؤولين**`)
                    .setThumbnail(interaction.guild.iconURL())
                    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                try {
                    await interaction.channel.send({ embeds: [timeend], components: [row] });
                } catch (error) {
                    return;
                }
            }
        });
    }
});
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId.startsWith('post_')) {
        const selectedValue = interaction.customId.split("_")[1];

        const modal = new ModalBuilder()
            .setTitle(`منشور @${selectedValue}`)
            .setCustomId(`posttype_${selectedValue}`);

        const ads = new TextInputBuilder()
            .setCustomId('ads')
            .setLabel("المنشور")
            .setRequired(true)
            .setStyle(TextInputStyle.Paragraph);

        const row = new ActionRowBuilder().addComponents(ads);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId.startsWith('posttype_')) {
        const user = interaction.guild.members.cache.get(interaction.user.id);
        const selectedValue = interaction.customId.split("_")[1];
        const ads = interaction.fields.getTextInputValue('ads');

        const btn = new ButtonBuilder()
            .setCustomId('back_button')
            .setLabel("الرجوع للقائمة الرئيسية")
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(btn);

        await interaction.update({ components: [row] });
        await interaction.channel.send({ content: `**تم إرسال منشورك بنجاح : ${user} ✅**` })

        const adsch = interaction.guild.channels.cache.get(channels.Public.post);
        if (adsch) {
            await adsch.send({ content: `${ads}\n\nتواصل مع: ${user}\n@${selectedValue}` });
        }
    }
});
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId === 'buy_select') {
        const selectedValue = interaction.values[0];
        if (selectedValue === 'ads_select') {
            const adsem = new EmbedBuilder()
                .setColor(settings.EmbedColor)
                .setDescription(`**:star2: Ads Informations・معلومات الإعلانات  :star2:

:moneybag: - أنواع الإعلانات وأسعارها - :moneybag:

- بدون منشن | إعلان بدون منشن
\`100k credit\`

- Here | إعلان مع منشن هير
\`150k credit \`

- Everyone | إعلان مع منشن ايفري ون
\`250k credit\`

- Ads Gifts | إعلان بروم هدايا مع جيفواي (لمدة 3 أيام)
\`500k credit القيف اوي عليك\`

- Private Channel With Giveaway | روم خاص مع قيف أواي (لمدة 3 أيام)
\`750k credit القيف اوي عليك\`

- First Channel With Giveaway | أول روم بالسيرفر مع قيف أواي (لمدة أسبوع)
>  قيف اوي علينا نص مليون
\`1,500,000\`**

**:clipboard: - ملاحظات مهمة - :clipboard:**
**
- :no_entry_sign: الإعلانات المخالفة: في حال نشر محتوى +18 سيتم حذف إعلانك.

- :hourglass_flowing_sand: مدة الإعلانات: جميع إعلانات الرومات الخاصة تشمل منشن Everyone لمدة ثلاث أيام.

- :arrows_counterclockwise: إعادة السحب (Reroll): مسموح إعادة السحب مرة واحدة إذا لم يلتزم الفائزون بالشروط.

- :no_entry_sign: عدم ضمان الأعضاء: لا يوجد أي ضمان لدخول الأعضاء عبر الإعلان.

- :x: الإعلانات المخالفة: إذا ورد إلينا بلاغان موثقان عن النصب من سيرفرك، سيتم حذف الإعلان بدون تعويض.**
**:clock3: تعديل الإعلان: مسموح تعديل الإعلان خلال أول 5 دقائق من نشره فقط، بعدها لن يتم التعديل.**

**:no_entry_sign: الإعلانات الممنوعة:

- إعلانات بيع أو شراء الكردت.

- الإعلانات التي تخص نظام الـReward.

- الإعلانات التي تحتوي على رابط إضافة بوت.**
**:moneybag: التحويل لـ : ( <@${settings.BankID}> )

:red_circle: تنبيه: إذا تم التحويل لأي حساب غير المذكور أعلاه، لن يتم تسليم الإعلان، ونحن غير مسؤولين عن ذلك.

:sparkles: تحياتنا، إدارة \`${interaction.guild.name}\` :sparkles:**`)

            const adstypeselect = new StringSelectMenuBuilder()
                .setCustomId('ads_select')
                .setOptions(
                    {
                        label: 'إعلان بدون منشن',
                        value: 'بدون منشن',
                    },
                    {
                        label: 'إعلان مع منشن هير',
                        value: 'منشن هير',
                    },
                    {
                        label: 'إعلان مع منشن ايفري ون',
                        value: 'منشن ايفري ون',
                    },
                    {
                        label: 'إعلان بروم هدايا مع جيفواي (لمدة 3 أيام)',
                        value: 'بروم الهداية',
                    },
                    {
                        label: 'روم خاص مع قيف أواي (لمدة 3 أيام)',
                        value: 'روم خاص مع قيف اوي',
                    },
                    {
                        label: 'أول روم بالسيرفر مع قيف أواي (لمدة أسبوع)',
                        value: 'اول روم',
                    },
                )
            const row = new ActionRowBuilder().addComponents(adstypeselect)
            await interaction.message.delete()
            await interaction.channel.send({ embeds: [adsem], components: [row] })
        }
    }
});
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId === 'ads_select') {
        const selectedValue = interaction.values[0];
        const user = interaction.guild.members.cache.get(interaction.user.id);

        const args = roles.price[selectedValue];

        let amount = parseAmount(args);

        const tax = calculateTax(amount);
        const wasitTax = calculateTax(tax);
        const brokerTaxWithoutPercentage = calculateTax(amount + wasitTax);
        const brokerTaxWithPercentage = calculateTax(brokerTaxWithoutPercentage);
        const brokerPercentage = calculateBrokerPercentage(amount);
        const transferWithoutTax = calculateTax(amount - brokerPercentage);
        const transferWithTax = calculateTax(transferWithoutTax);
        const args2 = parseInt(args)

        const buyads = new EmbedBuilder()
            .setTitle(`عملية شراء إعلان: \`${selectedValue}\``)
            .setColor(settings.EmbedColor)
            .setDescription(`**لإكمال شراء الإعلان \`${selectedValue}\` يرجى تحويل \`$${tax}\` إلى <@${settings.BankID}>

\`- ملاحظة:\`
- التحويل بالضريبة فقط، نحن غير مسؤولين عن التحويل بدون ضرائب.
- التحويل للبنك فقط، نحن غير مسؤولين عن التحويل لشخص آخر.
- التحويل داخل التذكرة فقط، نحن غير مسؤولين عن التحويل خارج التذكرة.

\`\`\`#credit ${settings.BankID} ${tax}\`\`\`**`);

        await interaction.reply({ embeds: [buyads] });
        await interaction.channel.send(`**#credit ${settings.BankID} ${tax}**`);

        const filter = (response) =>
            response.content.includes(settings.BankID) &&
            response.author.id === settings.ServerInfo.Probot &&
            response.content.includes(roles.price[selectedValue]);

        const collector = interaction.channel.createMessageCollector({ filter, time: 300000 });

        collector.on('collect', async (message) => {
            const logChannel = interaction.guild.channels.cache.get(channels.Log.AdsLog);
            if (logChannel) {
                const adsbtn = new ButtonBuilder()
                    .setCustomId(`ads_${selectedValue}`)
                    .setLabel("أرسل الإعلان")
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder().addComponents(adsbtn);

                const embed = new EmbedBuilder()
                    .setTitle("💳 عملية شراء إعلان 💳")
                    .setColor(settings.EmbedColor)
                    .setThumbnail(interaction.guild.iconURL())
                    .addFields(
                        { name: "👤 العميل", value: `<@${interaction.user.id}>`, inline: true },
                        { name: "🏅 نوع الإعلان", value: `\`${selectedValue}\``, inline: true }
                    )
                    .setTimestamp();

                await logChannel.send({ content: `**- ${user}**`, embeds: [embed] });

                const embed1 = new EmbedBuilder()
                    .setTitle("✅ عملية شراء ناجحة")
                    .setColor(settings.EmbedColor)
                    .addFields({ name: '🏅 نوع الإعلان', value: `\`${selectedValue}\`` })
                    .setTimestamp();

                await message.channel.send({ embeds: [embed1], components: [row] });
            }
        });

        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                const alreadybtn = new ButtonBuilder()
                    .setCustomId('back_button')
                    .setLabel("🔙 الرجوع للقائمة الرئيسية")
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder().addComponents(alreadybtn);

                const timeend = new EmbedBuilder()
                    .setTitle("❌ | انتهى الوقت")
                    .setColor(settings.EmbedColor)
                    .setDescription("**❌ | انتهى الوقت، لا تحول إذا حولت فنحن غير مسؤولين**")
                    .setTimestamp();

                try {
                    await interaction.channel.send({ embeds: [timeend], components: [row] });
                } catch (error) {
                    return;
                }
            }
        });
    }
});
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId.startsWith('ads_')) {
        const selectedValue = interaction.customId.split("_")[1];

        const modal = new ModalBuilder()
            .setTitle(`إعلان ${selectedValue}`)
            .setCustomId(`adstype_${selectedValue}`);

        const adss = new TextInputBuilder()
            .setCustomId('adss')
            .setLabel("الإعلان")
            .setRequired(true)
            .setStyle(TextInputStyle.Paragraph);

        const row1 = new ActionRowBuilder().addComponents(adss);
        modal.addComponents(row1);

        if (['روم خاص مع قيف اوي', 'اول روم'].includes(selectedValue)) {
            const channelName = new TextInputBuilder()
                .setCustomId('channelName')
                .setLabel("اسم الروم")
                .setRequired(true)
                .setStyle(TextInputStyle.Short);

            const row2 = new ActionRowBuilder().addComponents(channelName);
            modal.addComponents(row2);
        }

        try {
            await interaction.showModal(modal);
        } catch (error) {
            console.error("خطأ أثناء عرض المودال:", error);
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId.startsWith('adstype_')) {
        const selectedValue = interaction.customId.split("_")[1];
        const adsss = interaction.fields.getTextInputValue('adss');
        const adss = adsss.replace(/@everyone|@here/g, '');
        let channelName;

        if (['روم خاص مع قيف اوي', 'اول روم'].includes(selectedValue)) {
            channelName = interaction.fields.getTextInputValue('channelName');
            if (!channelName) {
                return interaction.reply({ content: '⚠️ يرجى إدخال اسم الروم.', ephemeral: true });
            }
        }

        const adsesschannel = interaction.guild.channels.cache.get(channels.Public.ads);
        const giftChannel = interaction.guild.channels.cache.get(channels.Public.gift);
        const user = interaction.guild.members.cache.get(interaction.user.id);

        const backButton = new ButtonBuilder()
            .setCustomId('back_button')
            .setLabel("🔙 الرجوع للقائمة الرئيسية")
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().setComponents(backButton);

        try {
            if (selectedValue === 'بدون منشن') {
                if (adsesschannel) await adsesschannel.send(`${adss}\n\n**إعلان مدفوع، نحن غير مسؤولين عن أي شيء يحدث داخل السيرفر.**`);
            } else if (selectedValue === 'منشن هير') {
                if (adsesschannel) await adsesschannel.send(`${adss}\n\n**إعلان مدفوع، نحن غير مسؤولين عن أي شيء يحدث داخل السيرفر.**\n@here`);
            } else if (selectedValue === 'منشن ايفري ون') {
                if (adsesschannel) await adsesschannel.send(`${adss}\n\n**إعلان مدفوع، نحن غير مسؤولين عن أي شيء يحدث داخل السيرفر.**\n@everyone`);
            } else if (selectedValue === 'بروم الهداية') {
                if (giftChannel) {
                    await giftChannel.send(`${adss}\n\n**إعلان مدفوع، نحن غير مسؤولين عن أي شيء يحدث داخل السيرفر.**\n@everyone`);
                    await giftChannel.send(`-start <#${giftChannel.id}> 3d 1 500k`);
                }
            } else if (selectedValue === 'روم خاص مع قيف اوي') {
                const privateRoom = await interaction.guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: channels.Public.adscategor,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.ViewChannel],
                            deny: [PermissionFlagsBits.SendMessages]
                        },
                        {
                            id: roles.Public.verifyrole,
                            allow: [PermissionFlagsBits.ViewChannel],
                            deny: [PermissionFlagsBits.SendMessages]
                        },
                    ],
                });

                if (privateRoom) {
                    await privateRoom.send(`${adss}\n\n**إعلان مدفوع، نحن غير مسؤولين عن أي شيء يحدث داخل السيرفر.**\n@everyone`);
                    await privateRoom.send(`-start <#${privateRoom.id}> 3d 1 750k`);
                }
            } else if (selectedValue === 'اول روم') {
                const adssChannel = await interaction.guild.channels.create({
                    name: channelName,
                    parent: channels.Public.FirstCat,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.ViewChannel],
                            deny: [PermissionFlagsBits.SendMessages]
                        },
                        {
                            id: roles.Public.verifyrole,
                            allow: [PermissionFlagsBits.ViewChannel],
                            deny: [PermissionFlagsBits.SendMessages]
                        },
                    ],
                });

                if (adssChannel) {
                    await adssChannel.send(`${adss}\n\n**إعلان مدفوع، نحن غير مسؤولين عن أي شيء يحدث داخل السيرفر.**\n@everyone`);
                    await adssChannel.send(`-start <#${adssChannel.id}> 7d 1 500k`);
                }
            }

            await interaction.channel.send({ content: `✅ **تم إرسال الإعلان بنجاح: ${user}**` });
            await interaction.update({ components: [row] });
        } catch (error) {
            console.error("خطأ أثناء إرسال الإعلان:", error);
            await interaction.reply({ content: '❌ حدث خطأ أثناء إرسال الإعلان، حاول مرة أخرى لاحقًا.', ephemeral: true });
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId === 'buy_select') {
        const selectedValue = interaction.values[0];
        if (selectedValue === 'private_select') {
            const privateem = new EmbedBuilder()
                .setColor(settings.EmbedColor)
                .setDescription(`**🎉 - معلومات الرومات الخاصة - 🎉

💰 سعر الروم: 250,000 💰

✨ - المميزات - ✨

- روم خاص باسمك يمكنك تغييره في أي وقت.
- نشر تلقائي كل ساعة مع صلاحية رفع الصور ومنشن @here.

📋 - الملاحظات - 📋

- يُسمح بالطلب والبيع داخل الروم الخاص.
- القوانين الخاصة بالرومات متوافقة مع قوانين البائعين.
- عند مخالفة القوانين سيتم إنهاء الروم، وفي حال التكرار سيتم حذفه نهائيًا.

🚨 - التحويل لـ : ( <@${settings.BankID}> ) - 🚨
🔴 تنبيه: إذا تم التحويل لأي حساب آخر غير المذكور أعلاه، لن يتم تسليمك الروم، ونحن غير مسؤولين عن ذلك.

🌟 تحياتنا لكم، إدارة \`${interaction.guild.name}\` 🌟**`)

            const privatetypeselect = new StringSelectMenuBuilder()
                .setCustomId('private_select')
                .setOptions(
                    {
                        label: 'شراء روم خاص',
                        value: '7d',
                    },
                    {
                        label: 'تجديد روم خاص',
                        value: 'renew7d',
                    },
                )
            const row = new ActionRowBuilder().addComponents(privatetypeselect)
            await interaction.message.delete()
            await interaction.channel.send({ embeds: [privateem], components: [row] })
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId === 'private_select') {
        const selectedValue = interaction.values[0];
        let privateSData = {};

        if (fs.existsSync(privateSPath)) {
            privateSData = JSON.parse(fs.readFileSync(privateSPath, 'utf8'));
        }

        if (privateSData[interaction.user.id] && selectedValue !== 'renew7d') {
            return await interaction.reply({
                content: `**❌ أنت تملك روم خاص بالفعل: <#${privateSData[interaction.user.id].roomId}>**`,
                ephemeral: true
            });
        }

        if (selectedValue === '7d') {
            const args = roles.price[selectedValue];

            let amount = parseAmount(args);

            const tax = calculateTax(amount);
            const wasitTax = calculateTax(tax);
            const brokerTaxWithoutPercentage = calculateTax(amount + wasitTax);
            const brokerTaxWithPercentage = calculateTax(brokerTaxWithoutPercentage);
            const brokerPercentage = calculateBrokerPercentage(amount);
            const transferWithoutTax = calculateTax(amount - brokerPercentage);
            const transferWithTax = calculateTax(transferWithoutTax);
            const args2 = parseInt(args)

            const buyrole = new EmbedBuilder()
                .setTitle(`عملية شراء روم خاص: ${selectedValue}`)
                .setColor(settings.EmbedColor)
                .setDescription(`**لإكمال شراء الروم الخاص يرجى تحويل: \`${tax}\` إلى <@${settings.BankID}>

\`- ملاحظة:\`
- التحويل **بالضريبة فقط**، لا نتحمل مسؤولية التحويل بدون ضرائب.
- التحويل **للبنك فقط**، لا نتحمل مسؤولية التحويل لشخص آخر.
- التحويل **داخل التذكرة فقط**، لا نتحمل مسؤولية التحويل خارج التذكرة.

\`\`\`#credit ${settings.BankID} ${tax}\`\`\`**`);

            await interaction.reply({ embeds: [buyrole] });
            await interaction.channel.send({ content: `**#credit ${settings.BankID} ${tax}**` });

            const channel = interaction.channel;
            const filter = (response) =>
                response.content.startsWith(`**:moneybag: | ${interaction.user.username}, has transferred \`$${roles.price[selectedValue]}\``) &&
                response.content.includes(settings.BankID) &&
                response.author.id === settings.ServerInfo.Probot &&
                response.content.includes(`${roles.price[selectedValue]}`);

            const collector = channel.createMessageCollector({ filter, time: 300000 });
            const user = interaction.guild.members.cache.get(interaction.user.id);

            collector.on('collect', async (message) => {
                if (user.roles.cache.has(roles.roleid.PrivateS)) return;

                await user.roles.add(roles.roleid.PrivateS);

                const logChannel = interaction.guild.channels.cache.get(channels.Log.PrivateSLog);
                if (logChannel) {
                    const btn = new ButtonBuilder()
                        .setCustomId("private_name_btn")
                        .setLabel("اضغط هنا")
                        .setStyle(ButtonStyle.Secondary);
                    const btns = new ActionRowBuilder().addComponents(btn);

                    const embed = new EmbedBuilder()
                        .setTitle("💳 عملية شراء روم خاص 💳")
                        .setColor(settings.EmbedColor)
                        .setThumbnail(interaction.guild.iconURL())
                        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                        .addFields(
                            { name: "👤 العميل", value: `<@${interaction.user.id}>`, inline: true },
                            { name: "🏅 مدة الروم", value: selectedValue, inline: true }
                        )
                        .setTimestamp();

                    await logChannel.send({ content: `**- ${user}**`, embeds: [embed] });

                    const embed1 = new EmbedBuilder()
                        .setTitle("✅ عملية شراء ناجحة")
                        .setColor(settings.EmbedColor)
                        .setThumbnail(interaction.guild.iconURL())
                        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                        .addFields(
                            { name: '🏅 مدة الروم', value: selectedValue }
                        )
                        .setTimestamp();

                    await message.channel.send({ embeds: [embed1], components: [btns] });

                    privateSData[interaction.user.id] = {
                        userId: interaction.user.id,
                        roomId: null,
                        roomName: null,
                        isOpen: false,
                        createdAt: Date.now(),
                        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
                    };
                    fs.writeFileSync(privateSPath, JSON.stringify(privateSData, null, 4));
                }
            });

            collector.on('end', async (collected) => {
                if (collected.size === 0) {
                    const alreadybtn = new ButtonBuilder()
                        .setCustomId('back_button')
                        .setLabel("🔙 الرجوع للقائمة الرئيسية")
                        .setStyle(ButtonStyle.Secondary);

                    const row = new ActionRowBuilder().addComponents(alreadybtn);
                    const timeend = new EmbedBuilder()
                        .setTitle("❌ | انتهى الوقت")
                        .setColor(settings.EmbedColor)
                        .setDescription(`**❌ | انتهى الوقت، إذا قمت بالتحويل بعد انتهاء المهلة، لن نتحمل المسؤولية**`)
                        .setThumbnail(interaction.guild.iconURL())
                        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                        .setTimestamp();
                    try {
                        await interaction.channel.send({ embeds: [timeend], components: [row] });
                    } catch (error) {
                        console.error(error);
                    }
                }
            });
        }

        if (selectedValue === 'renew7d') {
            const roomData = privateSData[interaction.user.id];
            const isOpen = privateSData[interaction.user.id].isOpen;
            if (!roomData) return interaction.reply({ content: "❌ لا تملك روم خاص لتجديده.", ephemeral: true });

            const user = interaction.guild.members.cache.get(interaction.user.id);
            const logChannel = interaction.guild.channels.cache.get(channels.Log.PrivateSLog);
            const room = interaction.guild.channels.cache.get(roomData.roomId);
            
            const args = roles.price[selectedValue];

            let amount = parseAmount(args);

            const tax = calculateTax(amount);

            const wasitTax = calculateTax(tax);

            const brokerTaxWithoutPercentage = calculateTax(amount + wasitTax);

            const brokerTaxWithPercentage = calculateTax(brokerTaxWithoutPercentage);

            const brokerPercentage = calculateBrokerPercentage(amount);

            const transferWithoutTax = calculateTax(amount - brokerPercentage);

            const transferWithTax = calculateTax(transferWithoutTax);

            const args2 = parseInt(args)

            if (!room) return interaction.reply({ content: "❌ لا يمكن العثور على الروم الخاص بك.", ephemeral: true });

            if(isOpen === true){
                await interaction.reply({ content: `**الروم الخاص فيك مو منتهي اول ماينتهي تعال جدد 🌹**
${interaction.user}` })
            }
               
            if(isOpen === false){
            await interaction.reply({ content: `#credit ${settings.BankID} ${tax}`
                                    });

            const filter = (m) =>
                m.content.includes(`:moneybag: | ${interaction.user.username}, has transferred \`$${roles.price[selectedValue]}\``) &&
                m.author.id === settings.ServerInfo.Probot &&
                m.content.includes(settings.BankID);

            const collector = interaction.channel.createMessageCollector({ filter, time: 300000 });

            collector.on('collect', async () => {
                roomData.expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000);
                roomData.isOpen = true;
                fs.writeFileSync(privateSPath, JSON.stringify(privateSData, null, 4));

                await room.permissionOverwrites.edit(interaction.user.id, { SendMessages: true });

                const messages = await room.messages.fetch({ limit: 100 });
                for (const msg of messages.values()) {
                    await msg.delete().catch(() => { });
                }

                const embed = new EmbedBuilder()
                    .setTitle("<:__:1337071225696157728> Private S Room")
                    .setThumbnail(user.user.displayAvatarURL({ dynamic: true, size: 1024 }))
                    .setColor(settings.EmbedColor)
                    .setFooter({ text: user.user.username, iconURL: user.user.displayAvatarURL({ dynamic: true, size: 1024 }) })
                    .setDescription(`**<:__:1337071225696157728> Owner : ${user}\n\n<:__:1337071225696157728> Open in : <t:${Math.floor(Date.now() / 1000)}:R>\n\n<:__:1337071225696157728> Ends in : <t:${Math.floor(roomData.expiresAt / 1000)}:R>**`);

                const changenamebtn = new ButtonBuilder()
                    .setCustomId(`change_${interaction.user.id}`)
                    .setLabel("Change Name")
                    .setStyle(ButtonStyle.Secondary);

                const buttons = new ActionRowBuilder().addComponents(changenamebtn);
                await room.send({ embeds: [embed], components: [buttons] });

                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle("✅ تجديد روم خاص")
                        .setColor(settings.EmbedColor)
                        .setThumbnail(interaction.guild.iconURL())
                        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                        .addFields(
                            { name: "👤 العميل", value: `<@${interaction.user.id}>`, inline: true },
                            { name: "🏅 مدة التجديد", value: "7 أيام", inline: true }
                        )
                        .setTimestamp();

                    await logChannel.send({ content: `**- ${user}**`, embeds: [logEmbed] });
                }
            });

            collector.on('end', async (collected) => {
                if (collected.size === 0) {
                    await interaction.followUp({ content: "❌ لم يتم التجديد في الوقت المحدد.", ephemeral: true });
                }
            });
        }
    }
        }
});

setInterval(checkPrivateRooms, 60 * 60 * 1000);

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId === 'private_name_btn') {
        const selectedValue = interaction.customId[0];

        const modal = new ModalBuilder()
            .setTitle(`عملية شراء روم خاص`)
            .setCustomId(`privateroombuy`);

        const privateroomname = new TextInputBuilder()
            .setCustomId('privateroomname')
            .setLabel("أسم الروم")
            .setRequired(true)
            .setMaxLength(10)
            .setStyle(TextInputStyle.Short);

        const row1 = new ActionRowBuilder().addComponents(privateroomname);
        modal.addComponents(row1);

        try {
            await interaction.showModal(modal);
        } catch (error) {
            console.error("خطأ أثناء عرض المودال:", error);
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId === 'privateroombuy') {
        const chname = interaction.fields.getTextInputValue('privateroomname');
        const PrivateScategory = interaction.guild.channels.cache.get(channels.Public.privateSCategory);
        const user = interaction.guild.members.cache.get(interaction.user.id);

        const backButton = new ButtonBuilder()
            .setCustomId('back_button')
            .setLabel("🔙 الرجوع للقائمة الرئيسية")
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().setComponents(backButton);
        const channelName = `✧・${chname}`;
        const creationTime = Date.now();
        const expirationTime = creationTime + 7 * 24 * 60 * 60 * 1000; // 7 أيام

        try {
            const privateSRoom = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: PrivateScategory,
                rateLimitPerUser: 3600,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                    },
                    {
                        id: roles.Public.verifyrole,
                        allow: [PermissionFlagsBits.ViewChannel],
                        deny: [PermissionFlagsBits.SendMessages]
                    },
                    {
                        id: user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.MentionEveryone]
                    },
                ],
            });

            const embed = new EmbedBuilder()
                .setTitle("- Private S Room")
                .setThumbnail(user.user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .setColor(settings.EmbedColor)
                .setFooter({ text: user.user.username, iconURL: user.user.displayAvatarURL({ dynamic: true, size: 1024 }) })
                .setDescription(`**<:__:1337071225696157728> Owner : ${user}

<:__:1337071225696157728> Open in : <t:${Math.floor(creationTime / 1000)}:R>

<:__:1337071225696157728> Ends in : <t:${Math.floor(expirationTime / 1000)}:R>**`);

            const changenamebtn = new ButtonBuilder()
                .setCustomId(`change_${interaction.user.id}`)
                .setLabel("Change Name")
                .setStyle(ButtonStyle.Secondary);

            const buttons = new ActionRowBuilder().addComponents(changenamebtn);
            if (privateSRoom) {
                await privateSRoom.send({ embeds: [embed], components: [buttons] });
            }

            await interaction.channel.send({ content: `✅ **تم إرسال أنشاء الروم الخاص بيك بنجاح : ${privateSRoom}**` });
            await interaction.update({ components: [row] });

            let privateSData = {};
            if (fs.existsSync(privateSPath)) {
                privateSData = JSON.parse(fs.readFileSync(privateSPath, 'utf8'));
            }

            privateSData[user.id] = {
                userId: user.id,
                roomId: privateSRoom.id,
                roomName: channelName,
                isOpen: true,
                createdAt: creationTime,
                expiresAt: expirationTime
            };

            fs.writeFileSync(privateSPath, JSON.stringify(privateSData, null, 4));

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ حدث خطأ أثناء إنشاء الروم، حاول مرة أخرى لاحقًا.', ephemeral: true });
        }
    }
});


client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('change_')) {
        const userId = interaction.customId.split('_')[1];
        if (interaction.user.id !== userId) {
            return await interaction.reply({ content: "**❌ لا تحاول، هذا ليس رومك!**", ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setTitle("تغيير اسم الروم")
            .setCustomId(`rename_room`)
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('new_room_name')
                        .setLabel("أدخل الاسم الجديد")
                        .setRequired(true)
                        .setMaxLength(10)
                        .setStyle(TextInputStyle.Short)
                )
            );

        await interaction.showModal(modal);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'rename_room') {
        const newName = interaction.fields.getTextInputValue('new_room_name');

        let privateSData = {};
        if (fs.existsSync(privateSPath)) {
            privateSData = JSON.parse(fs.readFileSync(privateSPath, 'utf8'));
        }

        const userRoom = Object.values(privateSData).find(room => room.userId === interaction.user.id);
        if (!userRoom) {
            return await interaction.reply({ content: "**❌ لم يتم العثور على روم خاص بك!**", ephemeral: true });
        }

        const room = interaction.guild.channels.cache.get(userRoom.roomId);
        if (!room) {
            return await interaction.reply({ content: "**❌ لا يمكن العثور على الروم الخاص بك!**", ephemeral: true });
        }

        try {
            await room.setName(`✧・${newName}`);

            privateSData[userRoom.userId].roomName = `✧・${newName}`;
            fs.writeFileSync(privateSPath, JSON.stringify(privateSData, null, 4));

            

            const disabledButton = new ButtonBuilder()
                .setCustomId(`change_disabled`)
                .setLabel("Change Name")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);

            await interaction.reply({
                content: "✅ | تم تغيير اسم الروم بنجاح",
                ephemeral: true
            })
            await interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(disabledButton)] });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: "**❌ حدث خطأ أثناء تغيير الاسم، حاول مرة أخرى لاحقًا.**", ephemeral: true });
        }
    }
});

let lastCloseMessageId = null;
let lastOpenMessageId = null;

async function clearMessages(channel) {
    let messages;
    do {
        messages = await channel.messages.fetch({ limit: 100 });
        if (messages.size > 0) {
            await channel.bulkDelete(messages, true);
            await new Promise(resolve => setTimeout(resolve, 1000)); // تجنب قيود الـ API
        }
    } while (messages.size > 0);
}

async function lockRooms(client, channels, roles) {
    const notificationChannel = await client.channels.fetch(channels.Public.OpenCloseRoom);

    if (notificationChannel && lastOpenMessageId) {
        try {
            const message = await notificationChannel.messages.fetch(lastOpenMessageId);
            if (message) await message.delete();
        } catch (error) {
            console.error('Failed to delete open message:', error);
        }
        lastOpenMessageId = null;
    }

    for (const roomId of channels.ShopRooms) {
        const channel = await client.channels.fetch(roomId);
        if (!channel) continue;

        const role = channel.guild.roles.cache.get(roles.Public.verifyrole);
        if (role) {
            await channel.permissionOverwrites.edit(role, {
                ViewChannel: false,
                SendMessages: false
            });
        }

        await clearMessages(channel);
    }

    if (notificationChannel) {
        const message = await notificationChannel.send('**@here تم إغلاق الرومات**');
        lastCloseMessageId = message.id;
    }
}

async function unlockRooms(client, channels, roles) {
    const notificationChannel = await client.channels.fetch(channels.Public.OpenCloseRoom);

    if (notificationChannel && lastCloseMessageId) {
        try {
            const message = await notificationChannel.messages.fetch(lastCloseMessageId);
            if (message) await message.delete();
        } catch (error) {
            console.error('Failed to delete close message:', error);
        }
        lastCloseMessageId = null;
    }

    for (const roomId of channels.ShopRooms) {
        const channel = await client.channels.fetch(roomId);
        if (!channel) continue;

        const role = channel.guild.roles.cache.get(roles.Public.verifyrole);
        if (role) {
            await channel.permissionOverwrites.edit(role, {
                ViewChannel: true,
                SendMessages: false
            });
        }
    }

    if (notificationChannel) {
        const message = await notificationChannel.send('**@here تم فتح الرومات**');
        lastOpenMessageId = message.id;
    }
}

client.once('ready', () => {
    cron.schedule('0 13 * * *', async () => { //13 = 12مساءً
        console.log('Locking rooms...');
        await lockRooms(client, channels, roles);
    });

    cron.schedule('0 21 * * *', async () => { //21 = 8صباحاً
        console.log('Unlocking rooms...');
        await unlockRooms(client, channels, roles);
    });
});
///////////////////
const Info = {
    reasons: [
        'منشن ايفري > سحب رتبه',
        'سحب رتبة بدون سبب > سحب رتبه',
        'بيع كريديت > سحب رتبه',
        'نشر بروم غلط > تحذير',
        'مخالفة قوانين الرتبه > تحذير',
    ],
};

client.on('interactionCreate', async interaction => {
    if (!interaction.isMessageContextMenuCommand()) return;

    if (interaction.commandName === 'تحذير البائع') {
        await interaction.deferReply({ ephemeral: true });

        if (!interaction.member.roles.cache.has(roles.Admins.DiscordStaff)) return;

        const seller = interaction.targetMessage.author;
        if (!seller) return interaction.editReply({ content: "❌ لا يمكن العثور على المستخدم.", ephemeral: true });

        const guildMember = await interaction.guild.members.fetch(seller.id).catch(() => null);
        if (!guildMember) return interaction.editReply({ content: "❌ العضو غير موجود في السيرفر.", ephemeral: true });

        const isSeller = guildMember.roles.cache.some(role => roles.RolesSellers.includes(role.id));
        if (!isSeller) return interaction.editReply({ content: "❌ هذا المستخدم ليس بائعاً.", ephemeral: true });

        const isInShopRoom = interaction.guild.channels.cache.some(channel =>
            channels.ShopRooms.includes(channel.id) && interaction.channel.id === channel.id
        );
        if (!isInShopRoom) return interaction.editReply({ content: "❌ هذا المنشور ليس في رومات البيع.", ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle("تحذير بائع جديد")
            .setDescription(`انت على وشك تحذير ${seller}، يرجى اختيار سبب التحذير من الأسفل.`)
            .setColor("Red");

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('selectReason')
                .setPlaceholder("اختر سبب التحذير")
                .addOptions(Info.reasons.map(reason => ({ label: reason, value: reason })))
        );

        const replyMessage = await interaction.editReply({ embeds: [embed], components: [row] });

        const filter = i => i.customId === 'selectReason' && i.user.id === interaction.user.id;
        const collector = replyMessage.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            const selectedReason = i.values[0];
            const warningType = selectedReason.includes('تحذير') ? 'تحذير' : 'سحب رتبه';

            try {
                if (warningType === 'تحذير') {
                    if (!guildMember.roles.cache.has(roles.roleid.Warn25)) {
                        await guildMember.roles.add(roles.roleid.Warn25);
                    } else if (!guildMember.roles.cache.has(roles.roleid.Warn50)) {
                        await guildMember.roles.add(roles.roleid.Warn50);
                    } else if (!guildMember.roles.cache.has(roles.roleid.Warn100)) {
                        await guildMember.roles.add(roles.roleid.Warn100);
                    } else {
                        await guildMember.roles.remove([roles.roleid.Warn25, roles.roleid.Warn50, roles.roleid.Warn100]);
                        const sellerRoles = roles.RolesSellers
                            .map(roleId => interaction.guild.roles.cache.get(roleId))
                            .filter(role => role);
                        if (sellerRoles.length > 0) {
                            await guildMember.roles.remove(sellerRoles.map(role => role.id));
                        }
                    }
                } else if (warningType === 'سحب رتبه') {
                    const sellerRoles = roles.RolesSellers
                        .map(roleId => interaction.guild.roles.cache.get(roleId))
                        .filter(role => role);
                    if (sellerRoles.length > 0) {
                        await guildMember.roles.remove(sellerRoles.map(role => role.id));
                    }
                }
            } catch (error) {
                console.error(error);
                await interaction.editReply({ content: "❌ خطأ أثناء إدارة الأدوار.", components: [] });
                return;
            }

            const hasAllWarns = guildMember.roles.cache.has(roles.roleid.Warn25) &&
                guildMember.roles.cache.has(roles.roleid.Warn50) &&
                guildMember.roles.cache.has(roles.roleid.Warn100);

            if (hasAllWarns) {
                for (const role of roles.RolesSellers) {
                    if (guildMember.roles.cache.has(role.id)) {
                        await guildMember.roles.remove(role.id);
                    }
                }
            }

            const targetMessage = interaction.targetMessage;
            if (!targetMessage) {
                return interaction.editReply({ content: "❌ لا توجد رسالة محددة.", ephemeral: true });
            }

            const ThePost = targetMessage.content || "لا توجد محتويات للرسالة.";

            const Room = await interaction.guild.channels.cache.get(channels.Public.Warns);
            const embedWarn = new EmbedBuilder()
                .setTitle("تحذير جديد")
                .addFields(
                    { name: "البائع", value: `${seller}`, inline: true },
                    { name: "الإداري", value: `${interaction.user}`, inline: true },
                    { name: "التحذير", value: selectedReason, inline: true },
                    { name: "الروم", value: `${interaction.channel}`, inline: true },
                    { name: "وقت التحذير", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                    { name: "المنشور", value: `\`\`\`${ThePost}\`\`\`` }
                )
                .setColor("Red");

            const T = await Room.send({ embeds: [embedWarn] });
            await interaction.editReply({ content: `✅ تم تحذير البائع ${seller} بنجاح!\n- [رابط التحذير](https://discord.com/channels/${interaction.guild.id}/${Room.id}/${T.id})`, components: [] });

            const DataPoints = readJSON(pointsFile);
            const adminData = DataPoints.find(entry => entry.userid === interaction.user.id);
            if (adminData) {
                adminData.points = (adminData.points || 0) + 1;
            } else {
                DataPoints.push({ userid: interaction.user.id, points: 1 });
            }
            writeJSON(pointsFile, DataPoints);

            const DataWarns = readJSON(warnsFile);
            DataWarns.push({
                userid: seller.id,
                staff: interaction.user.id,
                time: `<t:${Math.floor(Date.now() / 1000)}:R>`,
                reason: selectedReason,
                warn: warningType,
                info: targetMessage.content || "لا توجد محتويات للرسالة."
            });
            writeJSON(warnsFile, DataWarns);

            await targetMessage.delete();
            collector.stop();
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                interaction.editReply({ content: "⏳ انتهى الوقت، حاول مرة أخرى لاحقًا.", components: [] });
            }
        });
    }
});

client.on("messageCreate", async (message) => { 
    if (message.author.bot) return;
    if (!fs.existsSync(privateSPath)) return;

    try {
        const privateSData = JSON.parse(fs.readFileSync(privateSPath, 'utf8'));

        if (privateSData[message.author.id]) {
            const roomId = privateSData[message.author.id].roomId;

            if (message.channel.id === roomId) {
                await message.channel.send(settings.Pic.Line);
            }
        }
    } catch (error) {
        console.error("خطأ في قراءة أو تحليل ملف privateS.json:", error);
    }
});

client.on("messageCreate", async (message) => {

    if (message.content.startsWith(settings.prefix + 'setup-free-role')) {

        if (!message.member.roles.cache.has(roles.Admins.DiscordLeader)) return

        const guild = message.guild;

        const embed = new EmbedBuilder()

            .setTitle(message.guild.name + " | رتبة بيع مجانآ")

            .setDescription(`**- اضغط على الزر الي تحت حتى تاخذ رتبة بيع

- نتمنى لكم تجربة ممتعة 💙🌹**`)

            .setColor(settings.EmbedColor)

            

            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))

            .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true, size: 512 }) })

            .setTimestamp();

        const prove = new ActionRowBuilder().addComponents(

            new ButtonBuilder()

                .setCustomId('buyrole')

                

                .setLabel("➕")

                .setStyle(ButtonStyle.Secondary),

        )

        await message.delete()

        await message.channel.send({ embeds: [embed], components: [prove] })

    }

});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'buyrole') {
        const userId = interaction.user.id;
        const roleId = roles.sellerRole;

        const member = await interaction.guild.members.fetch(userId);
        const role = interaction.guild.roles.cache.get(roleId);
        const phoe = interaction.guild.roles.cache.get("1463689798890819821");

        if (!role || !phoe) {
            return interaction.reply({ content: '❌ لم يتم العثور على الرتبة.', flags: 64 });
        }

        if (member.roles.cache.has(roleId)) {
            return interaction.reply({ content: '**انت ماخذ الرتبة المجانية ❌**', flags: 64 });
        }

        // آمن
        if(role) await member.roles.add(role);
        if(phoe) await member.roles.add(phoe);

        await interaction.reply({ content: '**تم اعطائك رتب البيع بنجاح ✅**', flags: 64 });
    }
});


// داخل حدث messageCreate عندك أو مكان مناسب
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('$warn')) return;

  // تحقق من صلاحية المرسل (اختياري)
  if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers) && !message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return message.reply('ما عندك صلاحية تستخدم الأمر هذا.');
  }

  const target = message.mentions.members.first();
  if (!target) return message.reply('علم المستخدم اللي تبي تحذره بـ mention.');

  // بناء السيلكت
  const select = new StringSelectMenuBuilder()
    .setCustomId(`warn_select_${message.id}`)
    .setPlaceholder('اختر سبب التحذير')
    .addOptions([
      { label: 'نشر بروم غير مخصص', value: 'promo_misplace', description: 'نشر بروم في مكان غلط' },
      { label: 'سب و شتم', value: 'insult', description: 'إساءة أو شتم' },
      { label: 'اخرى', value: 'other', description: 'اكتب سبب يدوي' },
    ]);

  const row = new ActionRowBuilder().addComponents(select);

  const promptMsg = await message.channel.send({ content: `اختر سبب التحذير لـ ${target}`, components: [row] });

  // مكوّل للضغط على السيلكت (مرشح على صاحب الأمر)
  const filter = (interaction) => interaction.customId === `warn_select_${message.id}` && interaction.user.id === message.author.id;
  const collector = promptMsg.createMessageComponentCollector({ filter, max: 1, time: 60000 });

  collector.on('collect', async (interaction) => {
    await interaction.deferUpdate(); // يخفي "interaction failed"
    const choice = interaction.values[0];

    let reason = '';
    if (choice === 'promo_misplace') {
      reason = 'نشر بروم غير مخصص';
    } else if (choice === 'insult') {
      reason = 'سب و شتم';
    } else if (choice === 'other') {
      // نطلب السبب من صاحب الأمر
      const ask = await message.channel.send(`${message.author}, اكتب السبب الآن (عندك 60 ثانية).`);
      const msgFilter = m => m.author.id === message.author.id;
      const reasonCollector = message.channel.createMessageCollector({ filter: msgFilter, max: 1, time: 60000 });

      reasonCollector.on('collect', m => {
        reason = m.content;
        // ممكن تحذف رسالة السبب لو تبي: m.delete().catch(()=>{});
        sendWarnEmbed();
      });

      reasonCollector.on('end', collected => {
        if (collected.size === 0) {
          message.channel.send('انتهى الوقت وما انكتب سبب. تم إلغاء التحذير.');
        }
      });

      return; // نوقف هنا لأن sendWarnEmbed() تستدعى من داخل reasonCollector
    }

    // لو السبب محدد مسبقًا نرسل التحذير فورًا
    sendWarnEmbed();

    // الدالة ترسل الامبيد للروم المطلوب
    async function sendWarnEmbed() {
      try {
        const logChannelId = '1463690130245287956'; // الروم اللي طلبته
        const logChannel = await client.channels.fetch(logChannelId);
        if (!logChannel) return message.channel.send('ما تمكنت أوصل للروم المخصص للتسجيل.');

        const embed = new EmbedBuilder()
          .setTitle('ملخص تحذير')
          .setColor(0xFF0000) // أحمر
          .addFields(
            { name: 'المحذور', value: `<@${target.id}>`, inline: true },
            { name: 'المصدر', value: `${message.author.tag}`, inline: true },
            { name: 'السبب', value: reason || 'بدون سبب محدد' }
          )
          .setTimestamp();

        await logChannel.send({ content: `<@${target.id}>`, embeds: [embed] });
        await message.channel.send(`تم تسجيل التحذير لـ ${target} .`);
      } catch (err) {
        console.error(err);
        message.channel.send('صار خطأ وقت ارسال التحذير.');
      }
    }
  });

  collector.on('end', collected => {
    if (collected.size === 0) {
      promptMsg.edit({ content: 'انتهى الوقت ولم يتم اختيار سبب.', components: [] }).catch(()=>{});
    } else {
      // بعد الاختيار نقدر نشيل المكونات
      promptMsg.edit({ components: [] }).catch(()=>{});
    }
  });
});

client.on('messageCreate', async message => {  

    if (message.author.bot || !message.content.startsWith(settings.prefix)) return;  

    const args = message.content.slice(settings.prefix.length).trim().split(/ +/);  

    const command = args.shift().toLowerCase();  

    let DataPoints = readJSON(pointsFile);  

    if (command === "point") {  

        let target = message.mentions.users.first() || message.author;  

        const userData = DataPoints.find(entry => entry.userid === target.id);  

        const points = userData ? userData.points : 0;  

        message.reply(`**<@${target.id}> - \`${points}\` نقطة.**`);  

    }  

    if (command === "top") {  

        let sortedData = DataPoints.sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 10);  

        if (sortedData.length === 0) return message.reply("🚫 لا يوجد أي نقاط مسجلة حتى الآن.");  

        let leaderboard = sortedData.map((user, index) => `**${index + 1}.** <@${user.userid}> - ${user.points} نقطة`).join("\n");  
const topembed = new EmbedBuilder()
.setTitle("🏆 توب 10 بالنقاط:")
.setColor(settings.EmbedColor)
.setDescription(leaderboard)
.setFooter({
    text: "Bot Dev By: 6_gc - ALBaker",
 
})
        message.reply({ 
            embeds: [topembed]
                      });  

    }  

    if (command === "resetall") {  

        DataPoints = [];  

        writeJSON(pointsFile, DataPoints);  

        message.reply("🔄 تم تصفير جميع النقاط بنجاح.");  

    }  

    if (command === "resetpoint") {  

        let target = message.mentions.users.first();  

        if (!target) return message.reply("❌ يجب منشن الشخص، مثال: `!resetpoint @شخص`");  

        DataPoints = DataPoints.filter(entry => entry.userid !== target.id);  

        writeJSON(pointsFile, DataPoints);  

        message.reply(`🔄 تم تصفير نقاط <@${target.id}> بنجاح.`);  

    }  

    if (command === "points") {  

        if (!message.member.roles.cache.has(roles.Admins.DiscordLeader)) return;  

        let target = message.mentions.users.first();  

        if (!target || args.length < 2) return;  

        let amount = parseInt(args[1]);  

        if (isNaN(amount)) return message.reply("❌ يجب إدخال رقم صحيح.");  

        let userData = DataPoints.find(entry => entry.userid === target.id);  

        if (!userData) {  

            userData = { userid: target.id, points: 0 };  

            DataPoints.push(userData);  

        }  

        if (amount < 0) {  

            if (userData.points + amount < 0) return message.reply(`❌ لا يمكن إزالة ${Math.abs(amount)} نقطة، لأن <@${target.id}> لديه فقط **${userData.points}** نقطة.`);  

        }  

        userData.points += amount;  

        writeJSON(pointsFile, DataPoints);  

        message.reply(`${amount > 0 ? '✅' : '❌'} <@${target.id}> لديه الآن **${userData.points}** نقطة.`);  

    }  


    
});