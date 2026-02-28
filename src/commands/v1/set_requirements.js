const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set_requirements')
    .setDescription('[Free] Set promotion requirements for a rank')
    .addStringOption(opt => opt.setName('rank').setDescription('Which rank to configure').setRequired(true)
      .addChoices(
        { name: 'Staff', value: 'staff' },
        { name: 'Senior', value: 'senior' },
        { name: 'Manager', value: 'manager' },
        { name: 'Admin', value: 'admin' }
      ))
    .addIntegerOption(opt => opt.setName('points').setDescription('Min points needed').setRequired(true).setMinValue(0))
    .addIntegerOption(opt => opt.setName('shifts').setDescription('Min shifts completed').setRequired(true).setMinValue(0))
    .addIntegerOption(opt => opt.setName('consistency').setDescription('Min consistency % (0-100)').setRequired(true).setMinValue(0).setMaxValue(100))
    .addIntegerOption(opt => opt.setName('max_warnings').setDescription('Max warnings allowed').setRequired(false).setMinValue(0))
    .addIntegerOption(opt => opt.setName('shift_hours').setDescription('Min shift hours').setRequired(false).setMinValue(0))
    .addIntegerOption(opt => opt.setName('achievements').setDescription('Min achievements needed (Premium)').setRequired(false).setMinValue(0))
    .addIntegerOption(opt => opt.setName('reputation').setDescription('Min reputation points (Premium)').setRequired(false).setMinValue(0))
    .addIntegerOption(opt => opt.setName('days_in_server').setDescription('Min days in server (Enterprise)').setRequired(false).setMinValue(0))
    .addIntegerOption(opt => opt.setName('clean_record_days').setDescription('Min days with no warnings (Enterprise)').setRequired(false).setMinValue(0)),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    const guildId = interaction.guildId;
    const rank = interaction.options.getString('rank');
    const points = interaction.options.getInteger('points');
    const shifts = interaction.options.getInteger('shifts');
    const consistency = interaction.options.getInteger('consistency');
    const maxWarnings = interaction.options.getInteger('max_warnings');
    const shiftHours = interaction.options.getInteger('shift_hours');
    const achievements = interaction.options.getInteger('achievements');
    const reputation = interaction.options.getInteger('reputation');
    const daysInServer = interaction.options.getInteger('days_in_server');
    const cleanRecordDays = interaction.options.getInteger('clean_record_days');

    let guildData = await Guild.findOne({ guildId }) || new Guild({ guildId, name: interaction.guild.name, ownerId: interaction.guild.ownerId });

    if (!guildData.promotionRequirements) guildData.promotionRequirements = {};
    if (!guildData.promotionRequirements[rank]) guildData.promotionRequirements[rank] = {};

    guildData.promotionRequirements[rank].points = points;
    guildData.promotionRequirements[rank].shifts = shifts;
    guildData.promotionRequirements[rank].consistency = consistency;
    
    if (maxWarnings !== null) guildData.promotionRequirements[rank].maxWarnings = maxWarnings;
    if (shiftHours !== null) guildData.promotionRequirements[rank].shiftHours = shiftHours;
    if (achievements !== null) guildData.promotionRequirements[rank].achievements = achievements;
    if (reputation !== null) guildData.promotionRequirements[rank].reputation = reputation;
    if (daysInServer !== null) guildData.promotionRequirements[rank].daysInServer = daysInServer;
    if (cleanRecordDays !== null) guildData.promotionRequirements[rank].cleanRecordDays = cleanRecordDays;

    guildData.markModified('promotionRequirements');
    await guildData.save();

    const fields = [
      { name: '1️⃣ ⭐ Min Points', value: points.toString(), inline: true },
      { name: '2️⃣ 🔄 Min Shifts', value: shifts.toString(), inline: true },
      { name: '3️⃣ 📈 Min Consistency', value: `${consistency}%`, inline: true }
    ];

    if (maxWarnings !== null) fields.push({ name: '4️⃣ ⚠️ Max Warnings', value: maxWarnings.toString(), inline: true });
    if (shiftHours !== null) fields.push({ name: '5️⃣ ⏰ Min Shift Hours', value: shiftHours.toString(), inline: true });
    if (achievements !== null) fields.push({ name: '6️⃣ 🏅 Min Achievements', value: achievements.toString(), inline: true });
    if (reputation !== null) fields.push({ name: '7️⃣ 💫 Min Reputation', value: reputation.toString(), inline: true });
    if (daysInServer !== null) fields.push({ name: '8️⃣ 📅 Min Days In Server', value: daysInServer.toString(), inline: true });
    if (cleanRecordDays !== null) fields.push({ name: '9️⃣ ✅ Min Clean Record Days', value: cleanRecordDays.toString(), inline: true });

    const embed = createCoolEmbed()
      .setTitle(`⚙️ Requirements Set — ${rank.toUpperCase()}`)
      
      .addFields(...fields)
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};



