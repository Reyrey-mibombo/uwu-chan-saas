const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { Guild, Activity } = require('../../database/mongo');
const { createSuccessEmbed, createErrorEmbed, createCoolEmbed } = require('../../utils/enhancedEmbeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Provide or view server feedback')
        .addSubcommand(sub => sub
            .setName('submit')
            .setDescription('Submit feedback or suggestions back to the server owner')
            .addStringOption(opt => opt.setName('message').setDescription('Your entire feedback message').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('view')
            .setDescription('View recent feedback logs explicitly inside Discord (Admin Only)')
        ),

    async execute(interaction, client) {
        try {
            const subCommand = interaction.options.getSubcommand();
            const guildId = interaction.guildId;

            if (subCommand === 'submit') {
                await interaction.deferReply({ ephemeral: true });
                const message = interaction.options.getString('message');

                // 📝 CREATE WEB DASH ACTIVITY LOG
                // The dashboard's /activity-logs endpoint pulls anything from Activity where guildId matches.
                // By using type: 'message' / 'feedback', it'll show beautifully on the website!
                await Activity.create({
                    guildId,
                    userId: interaction.user.id,
                    type: 'message',
                    meta: `Feedback Submitted: ${message.length > 50 ? message.substring(0, 50) + '...' : message}`,
                    data: {
                        fullFeedback: message,
                        actionBy: interaction.user.tag
                    }
                });

                const embed = createSuccessEmbed('Feedback Transmitted!')
                    .setDescription(`Thank you, **${interaction.user.username}**! Your feedback has been recorded securely and sent to the dashboard logs.\n\n\`\`\`${message}\`\`\``);

                return interaction.editReply({ embeds: [embed] });
            }

            if (subCommand === 'view') {
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ embeds: [createErrorEmbed('You must be an Administrator to view raw feedback logs here.')], ephemeral: true });
                }

                await interaction.deferReply({ ephemeral: true });

                const activities = await Activity.find({
                    guildId,
                    meta: { $regex: /Feedback Submitted/i }
                }).sort({ createdAt: -1 }).limit(10).lean();

                if (!activities.length) {
                    return interaction.editReply({ embeds: [createCoolEmbed({ title: '💡 Feedback Hub', description: 'No feedback entries logged yet in the dashboard.' })] });
                }

                const embed = new EmbedBuilder()
                    .setTitle('💡 Recent Server Feedback Logs')
                    .setColor(0x00b7ff)
                    .setDescription('Displaying the latest 10 submissions fetched from the Dashboard Activity Logs.');

                for (const [index, log] of activities.entries()) {
                    const fbUser = `<@${log.userId}>`;
                    const content = log.data?.fullFeedback || log.meta || 'No content';
                    const timestamp = `<t:${Math.floor(new Date(log.createdAt).getTime() / 1000)}:R>`;

                    embed.addFields({
                        name: `#${index + 1} By ${log.data?.actionBy || 'Unknown User'} — ${timestamp}`,
                        value: `> ${content}`
                    });
                }

                return interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('[Feedback]', error);
            const eWrap = interaction.deferred ? 'editReply' : 'reply';
            try { await interaction[eWrap]({ embeds: [createErrorEmbed('Failed to process feedback commands.')], ephemeral: true }); } catch (e) { }
        }
    }
};
