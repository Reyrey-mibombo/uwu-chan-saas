// src/commands/activity_chart.js
import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
} from 'discord.js';
import { Activity } from '../../database/mongo.js';
import { format, subDays } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import fetch from 'node-fetch';
import { activityCache } from './_activityCache.js';

// ---------- Helper functions (same as previous answer) ----------
function getEmbedColour(avg, max) {
  if (max === 0) return '#555555';
  const ratio = avg / max;
  if (ratio >= 0.66) return '#2ecc71';
  if (ratio >= 0.33) return '#f1c40f';
  return '#e74c3c';
}
function buildBar(count, max) {
  const totalBlocks = 20;
  const filled = Math.round((count / max) * totalBlocks);
  const empty = totalBlocks - filled;
  const colour = filled / totalBlocks;
  const emoji = colour >= 0.66 ? '🟩' : colour >= 0.33 ? '🟨' : '🟥';
  return `${emoji.repeat(filled)}${'⬜'.repeat(empty)}`;
}
function quickChartUrl(data) {
  const labels = Object.keys(data);
  const values = Object.values(data);
  const cfg = {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Activities', data: values, backgroundColor: '#2ecc71' }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
  };
  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(cfg))}&w=500&h=300`;
}
function makeCsv(data) {
  const header = 'Date,Count\n';
  const rows = Object.entries(data)
    .map(([date, cnt]) => `${date},${cnt}`)
    .join('\n');
  return header + rows;
}

// ---------- Default guild settings storage (in‑memory) ----------
const guildDefaults = new Map(); // guildId → { days, timezone, adminOnly }

function getGuildDefaults(guildId) {
  const defaults = guildDefaults.get(guildId);
  return {
    days: defaults?.days ?? 7,
    timezone: defaults?.timezone ?? 'UTC',
    adminOnly: defaults?.adminOnly ?? false,
  };
}

// ---------- Command builder ----------
export const data = new SlashCommandBuilder()
  .setName('activity_chart')
  .setDescription('Show server activity chart')
  // Main command options (optional – they override defaults)
  .addIntegerOption(o =>
    o.setName('days')
      .setDescription('How many days back (max 30)')
      .setMinValue(1)
      .setMaxValue(30)
  )
  .addStringOption(o =>
    o.setName('timezone')
      .setDescription('IANA timezone (e.g. America/New_York)')
  )
  .addBooleanOption(o =>
    o.setName('image')
      .setDescription('Include a generated chart image')
  )
  .addBooleanOption(o =>
    o.setName('adminonly')
      .setDescription('Restrict to admins (overrides guild default)')
  )
  // Sub‑command for setting defaults
  .addSubcommand(sub =>
    sub
      .setName('setdefaults')
      .setDescription('Set default look‑back, timezone and admin‑only flag')
      .addIntegerOption(o =>
        o.setName('days')
          .setDescription('Default days back (max 30)')
          .setMinValue(1)
          .setMaxValue(30)
      )
      .addStringOption(o =>
        o.setName('timezone')
          .setDescription('Default IANA timezone')
      )
      .addBooleanOption(o =>
        o.setName('adminonly')
          .setDescription('Make the command admin‑only by default')
      )
  );

// ---------- Core logic (fetch + aggregation) ----------
async function fetchAndAggregate(guildId, start, end, tz, channelId, userId) {
  // Build a cache key that includes all filters
  const cacheKey = JSON.stringify({ guildId, start: start.toISOString(), end: end.toISOString(), tz, channelId, userId });
  const cached = activityCache.get(cacheKey);
  if (cached) return cached;

  // DB query – lean for speed
  const query = {
    guildId,
    createdAt: { $gte: start, $lte: end },
  };
  if (channelId) query.channelId = channelId;
  if (userId) query.userId = userId;

  const raw = await Activity.find(query).lean();

  // Build day map (chronological)
  const dayMap = {};
  const dayLabels = [];
  const dayCount = Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1;
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const zoned = utcToZonedTime(d, tz);
    const key = format(zoned, 'yyyy‑MM‑dd (EEE)');
    dayMap[key] = 0;
    dayLabels.push(key);
  }

  raw.forEach(act => {
    const zoned = utcToZonedTime(act.createdAt, tz);
    const key = format(zoned, 'yyyy‑MM‑dd (EEE)');
    if (key in dayMap) dayMap[key] += 1;
  });

  const result = { dayMap, dayLabels };
  activityCache.set(cacheKey, result);
  return result;
}

// ---------- Interaction handling ----------
export async function execute(interaction) {
  // ---------- Sub‑command: setdefaults ----------
  if (interaction.options.getSubcommand(false) === 'setdefaults') {
    const days = interaction.options.getInteger('days');
    const tz = interaction.options.getString('timezone');
    const adminOnly = interaction.options.getBoolean('adminonly');

    const current = guildDefaults.get(interaction.guildId) ?? {};
    const newSettings = {
      days: days ?? current.days ?? 7,
      timezone: tz ?? current.timezone ?? 'UTC',
      adminOnly: adminOnly ?? current.adminOnly ?? false,
    };
    guildDefaults.set(interaction.guildId, newSettings);
    return interaction.reply({
      content: `✅ Default settings saved:\n• Days: **${newSettings.days}**\n• Timezone: **${newSettings.timezone}**\n• Admin‑only: **${newSettings.adminOnly ? 'Yes' : 'No'}**`,
      ephemeral: true,
    });
  }

  // ---------- Permission guard ----------
  const defaults = getGuildDefaults(interaction.guildId);
  const adminOnlyFlag = interaction.options.getBoolean('adminonly') ?? defaults.adminOnly;
  if (adminOnlyFlag && !interaction.memberPermissions?.has('Administrator')) {
    return interaction.reply({
      content: '❌ You need the **Administrator** permission to run this command.',
      ephemeral: true,
    });
  }

  // ---------- Defer reply (gives us time for DB) ----------
  await interaction.deferReply();

  // ---------- Resolve options (fallback to defaults) ----------
  const days = interaction.options.getInteger('days') ?? defaults.days;
  const tz = interaction.options.getString('timezone') ?? defaults.timezone;
  const includeImg = interaction.options.getBoolean('image') ?? false;

  // Pagination state – we store the “offset” (how many days back the window starts)
  // The first view starts at `offset = 0` (most recent `days` days)
  const offset = interaction.options.getInteger('offset') ?? 0; // internal use only
  const start = subDays(new Date(), offset + days);
  const end = subDays(new Date(), offset);

  // Optional filters (channel / user) – they come from the select‑menu customId payload
  const filterPayload = interaction.options.getString('filterPayload') ?? null;
  let channelId = null;
  let userId = null;
  if (filterPayload) {
    const parsed = JSON.parse(filterPayload);
    channelId = parsed.channelId ?? null;
    userId = parsed.userId ?? null;
  }

  // ---------- Fetch & aggregate ----------
  let dayMap, dayLabels;
  try {
    const agg = await fetchAndAggregate(
      interaction.guildId,
      start,
      end,
      tz,
      channelId,
      userId
    );
    dayMap = agg.dayMap;
    dayLabels = agg.dayLabels;
  } catch (e) {
    console.error('Activity fetch error:', e);
    return interaction.editReply({
      content: '❌ Something went wrong while fetching activity data.',
    });
  }

  // ---------- No data fallback ----------
  const total = Object.values(dayMap).reduce((a, b) => a + b, 0);
  if (total === 0) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Activity Chart')
      .setDescription('No activity recorded for the selected period.')
      .setColor('#555555')
      .setTimestamp()
      .setFooter({ text: `Period: ${days} day(s) • TZ: ${tz}` });
    return interaction.editReply({ embeds: [embed] });
  }

  // ---------- Stats ----------
  const max = Math.max(...Object.values(dayMap));
  const avg = total / dayLabels.length;

  // ---------- Build embed fields ----------
  const fields = dayLabels.map(label => ({
    name: label,
    value: `${buildBar(dayMap[label], max)} **${dayMap[label]}**`,
    inline: true,
  }));

  const embed = new EmbedBuilder()
    .setTitle('📈 Activity Chart')
    .setDescription(
      `**Period:** ${days} day(s) (offset ${offset}) • **Timezone:** ${tz}\n` +
      `**Total:** ${total} • **Avg/day:** ${avg.toFixed(2)}`
    )
    .setColor(getEmbedColour(avg, max))
    .addFields(fields)
    .setTimestamp()
    .setFooter({ text: `Requested by ${interaction.user.username}` });

  if (includeImg) embed.setImage(quickChartUrl(dayMap));

  // ---------- Build interactive components ----------
  const components = [];

  // 1️⃣ Pagination buttons
  const paginationRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`activity_prev|${JSON.stringify({
        days,
        tz,
        offset,
        filterPayload,
        includeImg,
      })}`)
      .setLabel('⬅️ Previous')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(offset + days >= 30), // prevent going beyond 30‑day window
    new ButtonBuilder()
      .setCustomId(`activity_next|${JSON.stringify({
        days,
        tz,
        offset,
        filterPayload,
        includeImg,
      })}`)
      .setLabel('Next ➡️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(offset === 0) // cannot go forward past “now”
  );
  components.push(paginationRow);

  // 2️⃣ Filter select‑menu (channels + users)
  const filterOptions = [];

  // Channels (only text channels the bot can see)
  interaction.guild.channels.cache
    .filter(c => c.isTextBased())
    .forEach(c => {
      filterOptions.push({
        label: `#${c.name}`,
        description: `Filter to this channel`,
        value: JSON.stringify({ channelId: c.id, userId: null }),
      });
    });

  // Users (top 10 most active in the period – quick heuristic)
  const topUsers = await Activity.aggregate([
    { $match: { guildId: interaction.guildId, createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
  topUsers.forEach(u => {
    const member = interaction.guild.members.cache.get(u._id);
    if (!member) return;
    filterOptions.push({
      label: member.user.username,
      description: `Filter to ${member.user.username}`,
      value: JSON.stringify({ channelId: null, userId: u._id }),
    });
  });

  // Add a “clear filters” option
  filterOptions.unshift({
    label: '❌ Clear filters',
    description: 'Show activity for all channels & users',
    value: JSON.stringify({ channelId: null, userId: null }),
  });

  const filterRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`activity_filter|${JSON.stringify({
        days,
        tz,
        offset,
        includeImg,
      })}`)
      .setPlaceholder('Filter by channel or user')
      .addOptions(filterOptions.slice(0, 25)) // Discord limit = 25 options
  );
  components.push(filterRow);

  // 3️⃣ Export CSV button
  const exportRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`activity_export|${JSON.stringify({
        days,
        tz,
        offset,
        filterPayload,
        includeImg,
      })}`)
      .setLabel('📥 Export CSV')
      .setStyle(ButtonStyle.Success)
  );
  components.push(exportRow);

  // ---------- Send the reply ----------
  await interaction.editReply({ embeds: [embed], components });

  // ---------- Component collector (handles button/menu clicks) ----------
  const collector = interaction.channel.createMessageComponentCollector({
    filter: i => i.user.id === interaction.user.id,
    time: 5 * 60 * 1000, // 5 min
    componentType: ComponentType.Button | ComponentType.StringSelect,
  });

  collector.on('collect', async i => {
    // Parse the customId payload
    const [action, payloadStr] = i.customId.split('|');
    const payload = JSON.parse(payloadStr);

    // Helper to re‑run the command with new parameters
    const rerun = async newOpts => {
      // Build a synthetic interaction that re‑uses the same execute() logic
      // We’ll just call execute() again with a *fake* interaction object that contains the merged options.
      // For simplicity we’ll edit the original reply (same embed) – the collector stays alive.
      const merged = { ...payload, ...newOpts };
      // Re‑calculate offset, filters, etc.
      const fakeInteraction = {
        ...interaction,
        options: {
          getInteger: name => merged[name] ?? null,
          getString: name => merged[name] ?? null,
          getBoolean: name => merged[name] ?? null,
          getSubcommand: () => null,
        },
        deferReply: async () => {}, // already deferred
        editReply: interaction.editReply.bind(interaction),
        reply: interaction.reply.bind(interaction),
        memberPermissions: interaction.memberPermissions,
        user: interaction.user,
        guild: interaction.guild,
        channel: interaction.channel,
      };
      await execute(fakeInteraction);
    };

    if (action === 'activity_prev' || action === 'activity_next') {
      const newOffset = action === 'activity_prev' ? payload.offset + payload.days : Math.max(payload.offset - payload.days, 0);
      await rerun({ offset: newOffset });
    } else if (action === 'activity_filter') {
      const selected = i.values[0]; // JSON string
      await rerun({ filterPayload: selected, offset: 0 }); // reset pagination when filter changes
    } else if (action === 'activity_export') {
      // Build CSV from cached data (we already have dayMap)
      const csv = makeCsv(payload.filterPayload ? JSON.parse(payload.filterPayload) : dayMap);
      const attachment = {
        name: `activity_${interaction.guildId}_${Date.now()}.csv`,
        attachment: Buffer.from(csv, 'utf-8'),
      };
      await i.reply({ files: [attachment], ephemeral: true });
    }

    await i.deferUpdate(); // acknowledge the button press
  });

  collector.on('end', async () => {
    // Disable all components after timeout
    const disabled = components.map(row => {
      row.components.forEach(comp => comp.setDisabled(true));
      return row;
    });
    await interaction.editReply({ components: disabled });
  });
}
