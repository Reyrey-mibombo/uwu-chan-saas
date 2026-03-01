const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Activity } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('burnout_check')
        .setDescription('Zenith Hyper-Apex: Personnel Metabolic Stability & Load Modeling')
        .addUserOption(opt => opt.setName('user').setDescription('Personnel to audit (Optional)')),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const guildId = interaction.guildId;

            const activity24h = await Activity.countDocuments({
                userId: targetUser.id,
                guildId,
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            });

            // 1. Metabolic Stability Ribbon (ASCII)
            const loadFactor = Math.min(100, (activity24h / 50) * 100);
            const stability = 100 - loadFactor;

            const barLength = 12;
            const healthyChar = '█';
            const stressChar = '▒';
            const filled = healthyChar.repeat(Math.round((stability / 100) * barLength));
            const stress = stressChar.repeat(barLength - filled.length);
            const stabilityRibbon = `\`[${filled}${stress}]\` **${stability.toFixed(1)}% STABILITY**`;

            const loadStatus = loadFactor > 80 ? '🔴 CRITICAL LOAD' : (loadFactor > 50 ? '🟡 ELEVATED stress' : '🟢 REGENERATING');

            const embed = await createCustomEmbed(interaction, {
                title: '🧠 Zenith Hyper-Apex: Metabolic Load Audit',
                thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
                description: `### ⚖️ Macroscopic Psychological Modeling\nAnalyzing neural signal pressure and metabolic stability curves for **${targetUser.username}**.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '🔋 Metabolic Stability Ribbon', value: stabilityRibbon, inline: false },
                    { name: '🔥 Current Load', value: `\`${loadStatus}\``, inline: true },
                    { name: '📡 24h Signal Noise', value: `\`${activity24h}\` events`, inline: true },
                    { name: '⚖️ Burnout Risk', value: `\`${loadFactor.toFixed(1)}%\``, inline: true },
                    { name: '✨ Sync Bio-Node', value: '`ZENITH-BIO-SYNC`', inline: true },
                    { name: '🏢 Trajectory', value: stability > 50 ? '`STABLE`' : '`DANGER`', inline: true }
                ],
                footer: 'Metabolic Stability Modeling • V2 Expansion Hyper-Apex Suite',
                color: stability > 70 ? 'success' : (stability > 30 ? 'premium' : 'danger')
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Zenith Burnout Check Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Bio-Node failure: Unable to model metabolic stability curves.')] });
        }
    }
};
