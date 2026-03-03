const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { Guild } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set_branding')
        .setDescription('Enterprise Hyper-Apex: macroscopic Visual Entity Branding & Divine Frames')
        .addStringOption(opt => opt.setName('title').setDescription('The visual entity title').setRequired(true))
        .addStringOption(opt => opt.setName('color').setDescription('The hex color code (e.g. #7289DA)').setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Enterprise Hyper-Apex License Guard
            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: license.components });
            }

            const title = interaction.options.getString('title');
            const color = interaction.options.getString('color') || '#5865F2';

            await Guild.findOneAndUpdate({ guildId: interaction.guildId }, {
                'branding.title': title,
                'branding.color': color
            }, { upsert: true });

            // 1. Generate Divine Preview Frame (ASCII)
            const generateFrame = (text) => {
                const top = '╔' + '═'.repeat(text.length + 2) + '╗';
                const mid = '║ ' + text + ' ║';
                const bot = '╚' + '═'.repeat(text.length + 2) + '╝';
                return `\`\`\`\n${top}\n${mid}\n${bot}\n\`\`\``;
            };

            const previewFrame = generateFrame(title.toUpperCase());

            const embed = await createCustomEmbed(interaction, {
                title: '🎨 Enterprise Hyper-Apex: Visual Calibration',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### ✨ Divine Visual Identity Updated\nStrategic sector branding has been recalibrated for **${interaction.guild.name}**.\n\n**💎 VISUAL ENTITY PREVIEW**\n${previewFrame}\n\n**💎 Enterprise HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '🏷️ Entity Title', value: `\`${title}\``, inline: true },
                    { name: '🎨 Hex Resonance', value: `\`${color}\``, inline: true },
                    { name: '✨ Visual Tier', value: '`DIVINE [APEX]`', inline: true },
                    { name: '🛰️ Global Sync', value: '`CONNECTED`', inline: true },
                    { name: '🛡️ Auth Node', value: '`Enterprise-SYNC-08`', inline: true }
                ],
                footer: 'Visual Branding Engine • V8 Divine Identity Suite',
                color: 'premium'
            });

            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_set_branding').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Enterprise Set Branding Error:', error);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_set_branding').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('Visual Calibration failure: Unable to synchronize sector branding.')], components: [row] });
        }
    }
};




