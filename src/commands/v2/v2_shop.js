const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('v2_shop')
        .setDescription('🏪 High-fidelity Strategic Incentive Hub'),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            const guildId = interaction.guildId;

            const userData = await User.findOne({ userId: interaction.user.id, guildId });
            if (!userData || !userData.staff) {
                return interaction.editReply({ embeds: [createErrorEmbed('Access denied: Personnel registry entry not found.')] });
            }

            const points = userData.staff.points || 0;

            const embed = await createCustomEmbed(interaction, {
                title: '🏪 Strategic Incentive Hub',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🛡️ Resource Allocation Terminal\nExchange your accumulated **Strategic Points** for premium flairs and operational enhancements.\n\n**Current Balance:** \`${points.toLocaleString()}\` **PTS**`,
                fields: [
                    { name: '💎 [ULTRA] Tactical Flair (500 PTS)', value: 'Unlock a permanent 🌟 icon on your staff passport.', inline: false },
                    { name: '🎖️ [TITAN] Badge Frame (1,000 PTS)', value: 'Apply a special border to your profile card flairs.', inline: false },
                    { name: '👑 [APEX] Custom Honorific (5,000 PTS)', value: 'Override your rank with a custom tactical title.', inline: false }
                ],
                footer: 'Strategic incentives are non-refundable once authenticated.',
                color: 'enterprise'
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('buy_flair').setLabel('Buy Flair').setStyle(ButtonStyle.Success).setDisabled(points < 500),
                new ButtonBuilder().setCustomId('buy_frame').setLabel('Buy Frame').setStyle(ButtonStyle.Primary).setDisabled(points < 1000),
                new ButtonBuilder().setCustomId('buy_title').setLabel('Buy Title').setStyle(ButtonStyle.Danger).setDisabled(points < 5000)
            );

            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('V2 Shop Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Incentive terminal failure: Unable to establish connection.')] });
        }
    }
};
