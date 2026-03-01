const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('commend')
        .setDescription('🤝 Award honor points to a colleague for exemplary teamwork')
        .addUserOption(opt => opt.setName('user').setDescription('Colleague to commend').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for recognition').setRequired(true)),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');
            const guildId = interaction.guildId;

            if (targetUser.id === interaction.user.id) {
                return interaction.editReply({ embeds: [createErrorEmbed('Self-commendation protocol is prohibited for data integrity.')] });
            }

            const [sender, receiver] = await Promise.all([
                User.findOne({ userId: interaction.user.id, guildId }),
                User.findOne({ userId: targetUser.id, guildId })
            ]);

            if (!sender || !sender.staff || !receiver || !receiver.staff) {
                return interaction.editReply({ embeds: [createErrorEmbed('Personnel not found in the staff registry.')] });
            }

            // Logic: Increase honor points and update honorific title
            receiver.staff.honorPoints = (receiver.staff.honorPoints || 0) + 1;

            const honor = receiver.staff.honorPoints;
            if (honor >= 50) receiver.staff.honorific = 'Legendary Ally';
            else if (honor >= 25) receiver.staff.honorific = 'Distinguished Peer';
            else if (honor >= 10) receiver.staff.honorific = 'Reliable Partner';
            else if (honor >= 5) receiver.staff.honorific = 'Valued Colleague';

            await receiver.save();

            const embed = await createCustomEmbed(interaction, {
                title: '🤝 Peer Commendation Authenticated',
                description: `### 🛡️ Cultural Excellence Recognition\n<@${interaction.user.id}> has officially commended <@${targetUser.id}> for exemplary teamwork in sector **${interaction.guild.name}**.`,
                fields: [
                    { name: '👤 Recipient', value: `<@${targetUser.id}>`, inline: true },
                    { name: '🎖️ New Honorific', value: `\`${receiver.staff.honorific}\``, inline: true },
                    { name: '✨ Reason', value: `> *${reason}*`, inline: false }
                ],
                footer: 'Peer recognition builds organizational resilience. • V2 Apex',
                color: 'premium'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Commend Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Cultural suite failure: Unable to record peer recognition.')] });
        }
    }
};
