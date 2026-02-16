const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Guild, License } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy premium subscription')
    .addStringOption(option =>
      option.setName('plan')
        .setDescription('Select a plan')
        .addChoices(
          { name: 'Premium - $9.99/month', value: 'premium' },
          { name: 'Enterprise - $24.99/month', value: 'enterprise' }
        )
        .setRequired(true)),

  async execute(interaction, client) {
    const plan = interaction.options.getString('plan');
    const guildId = interaction.guildId;
    const guild = await Guild.findOne({ guildId });

    const prices = {
      premium: { monthly: 9.99, name: 'Premium' },
      enterprise: { monthly: 24.99, name: 'Enterprise' }
    };

    const selectedPlan = prices[plan];

    const licenseSystem = client.systems.license;
    const licenseKey = licenseSystem.generateLicenseKey();

    await License.create({
      key: licenseKey,
      userId: interaction.user.id,
      guildId: guildId,
      tier: plan,
      status: 'pending',
      createdAt: new Date()
    });

    const embed = new EmbedBuilder()
      .setTitle(`💎 Purchase ${selectedPlan.name}`)
      .setColor(0xe74c3c)
      .setDescription(`To complete your purchase, follow these steps:`)
      .addFields(
        { name: '1. License Key', value: `\`${licenseKey}\``, inline: false },
        { name: '2. Price', value: `$${selectedPlan.monthly}/month`, inline: true },
        { name: '3. Server', value: interaction.guild.name, inline: true }
      )
      .setFooter({ text: 'Contact the bot owner to complete payment!' });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setURL(`https://discord.gg/your-support-server`)
          .setLabel('Join Support Server')
          .setStyle(ButtonStyle.Link)
      );

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
