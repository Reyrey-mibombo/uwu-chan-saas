const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
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
        try {
            await interaction.deferReply({ ephemeral: true });

            const subcommand = interaction.options.getSubcommand();
            const guildId = interaction.guildId;

            let config = await ApplicationConfig.findOne({ guildId });
            if (!config) {
                return interaction.editReply({ embeds: [createErrorEmbed('Please run `/apply_setup` first to initialize the configuration in this server.')] });
            }

            // Default array handler
            let updated = false;
            if (!config.questions || config.questions.length === 0) {
                config.questions = [
                    "Why do you want to join our team?",
                    "What experience do you have?",
                    "How active can you be?"
                ];
                updated = true;
            }

            if (subcommand === 'list') {
                if (updated) await config.save();
                const qList = config.questions.map((q, i) => `**${i + 1}.** ${q}`).join('\n\n') || '*No questions configured.*';

                const embed = await createCustomEmbed(interaction, {
                    title: '📋 Custom Application Questions',
                    description: `The current questions your applicants will be asked:\n\n${qList}`,
                    footer: 'Note: Discord Modals only support a maximum of 5 questions.',
                    thumbnail: interaction.guild.iconURL({ dynamic: true })
                });

                return interaction.editReply({ embeds: [embed] });
            }

            if (subcommand === 'add') {
                if (config.questions.length >= 5) {
                    return interaction.editReply({ embeds: [createErrorEmbed('You cannot have more than 5 questions due to Discord API limitations on Modals.')] });
                }

                const newQ = interaction.options.getString('question');
                config.questions.push(newQ);
                await config.save();

                const embed = await createCustomEmbed(interaction, {
                    title: '✅ Question Added',
                    description: `Successfully added:\n> "${newQ}"\n\nYou now have **${config.questions.length}/5** active questions.`,
                    footer: 'Application Form Updated'
                });
                return interaction.editReply({ embeds: [embed] });
            }

            if (subcommand === 'remove') {
                if (config.questions.length <= 1) {
                    return interaction.editReply({ embeds: [createErrorEmbed('You must have at least 1 question for the application modal to function.')] });
                }

                const popped = config.questions.pop();
                await config.save();

                const embed = await createCustomEmbed(interaction, {
                    title: '🗑️ Question Removed',
                    description: `Removed the last question:\n> "${popped}"\n\nYou now have **${config.questions.length}/5** questions remaining.`,
                    footer: 'Application Form Updated'
                });
                return interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Apply Fields Error:', error);
            const errEmbed = createErrorEmbed('A database error occurred while modifying the application questions.');
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errEmbed] });
            } else {
                await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            }
        }
    }
};
