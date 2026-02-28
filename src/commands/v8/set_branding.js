const { SlashCommandBuilder } = require('discord.js');
const { createEnterpriseEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set_branding')
        .setDescription('Enterprise Only: Set custom branding (colors, footers) for your server embeds.')
        .addStringOption(opt => opt.setName('color').setDescription('Hex color code (e.g. #ff0000)').setRequired(false))
        .addStringOption(opt => opt.setName('footer').setDescription('Custom footer text').setRequired(false))
        .addStringOption(opt => opt.setName('icon_url').setDescription('URL to a custom footer icon').setRequired(false)),

    async execute(interaction, client) {
        const guildId = interaction.guildId;
        const guild = await Guild.findOne({ guildId });

        if (!guild || guild.premium.tier !== 'enterprise') {
            return interaction.reply({
                embeds: [createErrorEmbed('This is an Enterprise tier feature. Upgrade your server to unlock custom branding!')],
                ephemeral: true
            });
        }

        const color = interaction.options.getString('color');
        const footer = interaction.options.getString('footer');
        const iconURL = interaction.options.getString('icon_url');

        if (!color && !footer && !iconURL) {
            return interaction.reply({
                embeds: [createErrorEmbed('You must provide at least one branding option to update.')],
                ephemeral: true
            });
        }

        if (color && !/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
            return interaction.reply({
                embeds: [createErrorEmbed('Invalid color format. Please provide a valid hex color code (e.g., #ff0000).')],
                ephemeral: true
            });
        }

        if (!guild.customBranding) guild.customBranding = {};
        if (color) guild.customBranding.color = color;
        if (footer) guild.customBranding.footer = footer;
        if (iconURL) guild.customBranding.iconURL = iconURL;

        await guild.save();

        const embed = createEnterpriseEmbed({
            title: '🎨 Custom Branding Updated',
            description: 'Your server embeds will now use the new custom formatting.',
            branding: guild.customBranding
        }).addFields(
            { name: 'Color', value: color || guild.customBranding.color || 'Default', inline: true },
            { name: 'Footer', value: footer || guild.customBranding.footer || 'Default', inline: true },
            { name: 'Icon URL', value: iconURL ? '[Link](' + iconURL + ')' : (guild.customBranding.iconURL ? '[Link](' + guild.customBranding.iconURL + ')' : 'Default'), inline: true }
        );

        await interaction.reply({ embeds: [embed] });
    }
};
