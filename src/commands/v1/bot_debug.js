const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, version: discordVersion } = require('discord.js');
const { Guild } = require('../../database/mongo');
const mongoose = require('mongoose');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bot_debug')
        .setDescription('🔧 Diagnostic command to verify bot functionality')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const guildId = interaction.guildId;
            const startTime = Date.now();

            // Gather diagnostic information
            const diagnostics = {
                bot: {
                    username: client.user?.tag || 'Unknown',
                    id: client.user?.id || 'Unknown',
                    uptime: formatUptime(client.uptime),
                    wsPing: client.ws.ping + 'ms',
                    guilds: client.guilds.cache.size,
                    commandsLoaded: client.commands?.size || 0
                },
                discord: {
                    jsVersion: discordVersion,
                    apiLatency: Date.now() - interaction.createdTimestamp + 'ms'
                },
                database: {
                    status: mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected',
                    host: mongoose.connection.host || 'N/A',
                    name: mongoose.connection.name || 'N/A'
                },
                system: {
                    platform: os.platform(),
                    nodeVersion: process.version,
                    memoryUsed: formatBytes(process.memoryUsage().heapUsed),
                    memoryTotal: formatBytes(os.totalmem()),
                    cpus: os.cpus().length
                }
            };

            // Check guild registration status
            let guildStatus;
            try {
                const guildDoc = await Guild.findOne({ guildId });
                if (guildDoc) {
                    guildStatus = {
                        registered: '✅ Yes',
                        tier: guildDoc.premium?.tier || 'free',
                        isActive: guildDoc.premium?.isActive ? '✅ Yes' : '❌ No',
                        expiresAt: guildDoc.premium?.expiresAt
                            ? new Date(guildDoc.premium.expiresAt).toLocaleDateString()
                            : 'N/A'
                    };
                } else {
                    guildStatus = {
                        registered: '❌ No',
                        tier: 'N/A',
                        isActive: 'N/A',
                        expiresAt: 'N/A'
                    };
                }
            } catch (dbError) {
                guildStatus = {
                    registered: '❌ Error checking',
                    error: dbError.message
                };
            }

            // Check command availability by version
            const commandVersions = {};
            client.commands?.forEach(cmd => {
                const ver = cmd.requiredVersion || 'unknown';
                if (!commandVersions[ver]) commandVersions[ver] = [];
                if (commandVersions[ver].length < 5) commandVersions[ver].push(cmd.data.name);
            });

            // Calculate response time
            diagnostics.responseTime = Date.now() - startTime + 'ms';

            // Build embed
            const embed = new EmbedBuilder()
                .setTitle('🔧 Bot Diagnostic Report')
                .setColor(0x5865F2)
                .setTimestamp()
                .addFields(
                    {
                        name: '🤖 Bot Status',
                        value: [
                            `**User:** ${diagnostics.bot.username}`,
                            `**Uptime:** ${diagnostics.bot.uptime}`,
                            `**WebSocket Ping:** ${diagnostics.bot.wsPing}`,
                            `**Guilds:** ${diagnostics.bot.guilds}`,
                            `**Commands Loaded:** ${diagnostics.bot.commandsLoaded}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🗄️ Database Status',
                        value: [
                            `**Status:** ${diagnostics.database.status}`,
                            `**Host:** ${diagnostics.database.host}`,
                            `**Database:** ${diagnostics.database.name}`,
                            `**Response:** ${diagnostics.responseTime}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🏢 This Server',
                        value: [
                            `**Registered:** ${guildStatus.registered}`,
                            `**Tier:** ${guildStatus.tier || 'N/A'}`,
                            `**License Active:** ${guildStatus.isActive || 'N/A'}`,
                            `**Expires:** ${guildStatus.expiresAt || 'N/A'}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '💻 System Info',
                        value: [
                            `**Platform:** ${diagnostics.system.platform}`,
                            `**Node.js:** ${diagnostics.system.nodeVersion}`,
                            `**Memory:** ${diagnostics.system.memoryUsed} / ${diagnostics.system.memoryTotal}`,
                            `**CPUs:** ${diagnostics.system.cpus}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '📦 Discord.js',
                        value: [
                            `**Version:** v${diagnostics.discord.jsVersion}`,
                            `**API Latency:** ${diagnostics.discord.apiLatency}`
                        ].join('\n'),
                        inline: true
                    }
                );

            // Add command version breakdown
            let versionField = '';
            for (const [ver, cmds] of Object.entries(commandVersions).sort()) {
                versionField += `**${ver}:** ${cmds.length} commands (e.g., ${cmds.slice(0, 3).join(', ')}${cmds.length > 3 ? '...' : ''})\n`;
            }
            embed.addFields({
                name: '📋 Commands by Version',
                value: versionField || 'No commands loaded',
                inline: false
            });

            // Add troubleshooting tips based on findings
            const tips = [];
            if (diagnostics.bot.commandsLoaded === 0) {
                tips.push('❌ No commands loaded! Check the ENABLED_TIERS environment variable and command folder structure.');
            }
            if (diagnostics.database.status.includes('❌')) {
                tips.push('❌ Database disconnected! Check your MONGODB_URI environment variable.');
            }
            if (!guildStatus.registered.includes('✅')) {
                tips.push('⚠️ This server is not registered in the database. Commands may not work properly.');
            }
            if (client.ws.ping > 300) {
                tips.push('⚠️ High WebSocket latency detected. Bot may be experiencing connection issues.');
            }

            if (tips.length > 0) {
                embed.addFields({
                    name: '⚠️ Issues Detected',
                    value: tips.join('\n\n'),
                    inline: false
                });
            } else {
                embed.addFields({
                    name: '✅ All Systems Operational',
                    value: 'No issues detected! Your bot should be working correctly.',
                    inline: false
                });
            }

            embed.setFooter({ text: 'Run /ping for performance metrics | /help for command list' });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('[bot_debug] Error:', error);
            await interaction.editReply({
                content: `❌ Error running diagnostics: \`${error.message}\`\n\nThis indicates a critical issue with the bot setup.`
            });
        }
    }
};

function formatUptime(ms) {
    if (!ms) return 'Unknown';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m ${seconds % 60}s`;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
