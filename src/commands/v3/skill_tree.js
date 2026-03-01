const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { User } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skill_tree')
        .setDescription('Zenith Hyper-Apex: Personnel Proficiency Mapping & Tactical Skill Trees')
        .addUserOption(opt => opt.setName('user').setDescription('Personnel to audit').setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Zenith Hyper-Apex License Guard
            const license = await validatePremiumLicense(interaction);
            if (!license.allowed) {
                return interaction.editReply({ embeds: [license.embed], components: license.components });
            }

            const target = interaction.options.getUser('user') || interaction.user;
            const user = await User.findOne({ userId: target.id, guildId: interaction.guildId }).lean();

            if (!user || !user.staff) {
                return interaction.editReply({ embeds: [createErrorEmbed(`No proficiency trace found. <@${target.id}> is unmapped.`)] });
            }

            const pts = user.staff.points || 0;
            const mastery = user.staff.mastery || {};

            // Skill Nodes Logic
            const checkNode = (required) => pts >= required ? '✅' : '🔒';
            const progress = (cur, req) => `\`[${'█'.repeat(Math.min(5, Math.floor((cur / req) * 5)))}${'░'.repeat(Math.max(0, 5 - Math.floor((cur / req) * 5)))}]\``;

            const embed = await createCustomEmbed(interaction, {
                title: `🌌 Zenith Hyper-Apex: Skill Mapping [${target.username}]`,
                thumbnail: target.displayAvatarURL({ dynamic: true }),
                description: `### 🛡️ Personnel Proficiency Audit\nMapping interactive signal mastery and technical specializations for personnel **${target.username}**.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '🔥 Core Proficiency (Merit)', value: `Level: \`${Math.floor(pts / 100)}\` | Total: \`${pts}\``, inline: false },
                    { name: '📂 Operational Branch', value: `${checkNode(100)} Basic Patrol\n${checkNode(500)} Master Dispatch\n${checkNode(1000)} Sector Authority`, inline: true },
                    { name: '📊 Analytics Branch', value: `${checkNode(200)} Signal Audit\n${checkNode(600)} Macro Analysis\n${checkNode(1200)} AI Synchronization`, inline: true },
                    { name: '🛡️ Security Branch', value: `${checkNode(300)} Quick Guard\n${checkNode(700)} Threat Neutralizer\n${checkNode(1500)} Guardian Titan`, inline: true },
                    { name: '⚖️ Mastery Velocity', value: `> Tech: ${progress(mastery.technical || 0, 100)}\n> Admin: ${progress(mastery.admin || 0, 100)}\n> Social: ${progress(mastery.social || 0, 100)}`, inline: false }
                ],
                footer: 'Tactical Proficiency Mapping • V3 Workforce Hyper-Apex Suite',
                color: 'premium'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Zenith Skill Tree Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Skill Tree failure: Unable to decode personnel proficiency matrices.')] });
        }
    }
};
