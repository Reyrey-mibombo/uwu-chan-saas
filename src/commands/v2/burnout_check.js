const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Shift } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('burnout_check')
        .setDescription('📉 Analyze personnel shift density for operational fatigue risk')
        .addUserOption(opt => opt.setName('user').setDescription('Staff member (Optional)')),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const guildId = interaction.guildId;

            const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
            const shifts = await Shift.find({
                userId: targetUser.id,
                guildId,
                startTime: { $gte: fourteenDaysAgo },
                endTime: { $ne: null }
            }).lean();

            const totalMinutes = shifts.reduce((acc, s) => acc + (s.duration || 0), 0);
            const totalHours = (totalMinutes / 60).toFixed(1);
            const shiftCount = shifts.length;

            // Burnout Index Calculation (Arbitrary for SaaS feel)
            // High hours + High frequency = High risk
            const riskScore = Math.min(100, (totalHours * 1.5) + (shiftCount * 2));

            let status = '🟢 LOW RISK';
            let color = 'success';
            let recommendation = 'Personnel is operating within optimal sustainability parameters.';

            if (riskScore > 75) {
                status = '🔴 CRITICAL RISK';
                color = 'error';
                recommendation = '⚠️ **IMMEDIATE REST REQUIRED**. Operational fatigue detected. Recommend 48h standby.';
            } else if (riskScore > 40) {
                status = '🟡 MODERATE RISK';
                color = 'warning';
                recommendation = 'Monitor personnel closely. High operational density observed over 14-day window.';
            }

            const barLen = Math.floor(riskScore / 10);
            const riskBar = `\`${'█'.repeat(barLen)}${'░'.repeat(10 - barLen)}\` **${Math.floor(riskScore)}%**`;

            const embed = await createCustomEmbed(interaction, {
                title: `📉 Fatigue Analysis: ${targetUser.username}`,
                thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
                description: `### 🛡️ Sustainability Diagnostic\nMacroscopic fatigue analysis for sector **${interaction.guild.name}**. Assessment based on 14-day shift density telemetry.`,
                fields: [
                    { name: '⚖️ Burnout Index', value: riskBar, inline: false },
                    { name: '⏱️ 14D Duty Time', value: `\`${totalHours} Hours\``, inline: true },
                    { name: '🔄 Shift Volume', value: `\`${shiftCount} Patrols\``, inline: true },
                    { name: '📊 Fatigue Status', value: `\`${status}\``, inline: true },
                    { name: '📋 Strategic Advice', value: recommendation, inline: false }
                ],
                footer: 'Predictive Fatigue Modeling • V2 Apex Sustainability Suite',
                color: color
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Burnout Check Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Sustainability suite failure: Unable to calculate fatigue risk.')] });
        }
    }
};
