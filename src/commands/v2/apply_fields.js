const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCoolEmbed, createErrorEmbed } = require('../../utils/embeds');
const { ApplicationConfig } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apply_fields')
        .setDescription('Manage the custom questions for your application forms')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add a new question (Max 5)')
                .addStringOption(opt => opt.setName('question').setDescription('The exact question the user will see').setRequired(true).setMaxLength(45)))
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a question by its exact number'))
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('View all current application questions')),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        let config = await ApplicationConfig.findOne({ guildId });
        if (!config) {
            return interaction.editReply({ embeds: [createErrorEmbed('Please run `/apply_setup` first to initialize the configuration.')] });
        }

        // Default questions if missing
        if (!config.questions || config.questions.length === 0) {
            config.questions = [
                "Why do you want to join our team?",
                "What experience do you have?",
                "How active can you be?"
            ];
        }

        if (subcommand === 'list') {
            const qList = config.questions.map((q, i) => `**${i + 1}.** ${q}`).join('\n\n') || '*No questions configured.*';

            const embed = createCoolEmbed({
                title: '📋 Custom Application Questions',
                description: qList,
                color: 'info'
            }).setFooter({ text: 'Note: Discord Modals only support a maximum of 5 questions.' });

            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'add') {
            if (config.questions.length >= 5) {
                return interaction.editReply({ embeds: [createErrorEmbed('You cannot have more than 5 questions due to Discord API limitations on Modals.')] });
            }

            const newQ = interaction.options.getString('question');
            config.questions.push(newQ);
            await config.save();

            return interaction.editReply({
                embeds: [createCoolEmbed({
                    title: '✅ Question Added',
                    description: `Successfully added:\n> "${newQ}"\n\nYou now have **${config.questions.length}/5** questions.`,
                    color: 'success'
                })]
            });
        }

        if (subcommand === 'remove') {
            if (config.questions.length <= 1) {
                return interaction.editReply({ embeds: [createErrorEmbed('You must have at least 1 question for the application modal to work.')] });
            }

            const popped = config.questions.pop();
            await config.save();

            return interaction.editReply({
                embeds: [createCoolEmbed({
                    title: '🗑️ Question Removed',
                    description: `Removed the last question:\n> "${popped}"\n\nYou now have **${config.questions.length}/5** questions.`,
                    color: 'warning'
                })]
            });
        }
    }
};
