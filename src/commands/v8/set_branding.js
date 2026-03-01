const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { Guild } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set_branding')
        .setDescription('Zenith Apex: Elite Visual Identity & Branded System Synchronization')
        .addStringOption(opt => opt.setName('color').setDescription('Hex color code (e.g. #ff0000)').setRequired(false))
        .addStringOption(opt => opt.setName('footer').setDescription('Custom footer text').setRequired(false))
        .addStringOption(opt => opt.setName('icon_url').setDescription('URL to a custom footer icon').setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Zenith Apex: Absolute License Verification
            const license = await validatePremiumLicense(interaction);
            if (!license.allowed) {
                return interaction.editReply({ embeds: [license.embed], components: license.components });
            }

            const guildId = interaction.guildId;
            const guild = await Guild.findOne({ guildId });

            const color = interaction.options.getString('color');
            const footer = interaction.options.getString('footer');
            const iconURL = interaction.options.getString('icon_url');

            if (!color && !footer && !iconURL) {
                return interaction.editReply({ embeds: [createErrorEmbed('You must provide at least one visual identity parameter to synchronize.')] });
            }

            if (color && !/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
                return interaction.editReply({ embeds: [createErrorEmbed('Invalid spectral color format. Please provide a valid hex color code (e.g., #7289DA).')] });
            }

            if (!guild.customBranding) guild.customBranding = {};
            if (color) guild.customBranding.color = color;
            if (footer) guild.customBranding.footer = footer;
            if (iconURL) guild.customBranding.iconURL = iconURL;

            await Guild.updateOne({ guildId }, { $set: { customBranding: guild.customBranding } });

            const embed = await createCustomEmbed(interaction, {
                title: '🎨 Zenith Divine Identity: Brand Orchestration',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🛡️ Divine Sector Branding\nUnified visual identity parameters for **${interaction.guild.name}** have been synchronized across the entire Omni-Nexus ecosystem.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '✨ Spectral Color', value: `\`${color || 'UNCHANGED'}\``, inline: true },
                    { name: '📜 Divine Footer', value: `\`${footer || 'UNCHANGED'}\``, inline: true },
                    { name: '🖼️ Divine Iconography', value: iconURL ? '`SYNCHRONIZED`' : '`UNCHANGED`', inline: true },
                    { name: '⚖️ Visual Tier', value: '`DIVINE [HYPER-APEX]`', inline: true },
                    { name: '🔄 Omni-Bridge', value: '`V1-V8 ACTIVE`', inline: true },
                    { name: '🔄 System Sync', value: '`GLOBAL`', inline: true }
                ],
                footer: 'Divine Visual Identity Orchestration • V8 Identity Matrix Suite',
                color: 'premium'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Zenith Set Branding Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Identity failure: Unable to synchronize visual branding parameters.')] });
        }
    }
};
