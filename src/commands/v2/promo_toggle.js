const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { Guild } = require('../../database/mongo');
const { createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('promo_toggle')
        .setDescription('🔄 Toggle the auto-promotion system on or off')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Whether auto-promotion should be active').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const enabled = interaction.options.getBoolean('enabled');

        await Guild.findOneAndUpdate(
            { guildId: interaction.guildId },
            { $set: { 'settings.modules.automation': enabled } },
            { upsert: true }
        );

        const status = enabled ? '✅ ENABLED' : '❌ DISABLED';
        await interaction.reply({
            embeds: [createSuccessEmbed('System Updated', `The interactive auto-promotion system is now **${status}** for this server.`)],
            ephemeral: true
        });
    }
};
