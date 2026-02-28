const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { ApplicationConfig, ApplicationRequest } = require('../database/mongo');
const { createCoolEmbed, createErrorEmbed, createSuccessEmbed } = require('./embeds');

async function handleApplyButton(interaction) {
    if (interaction.customId !== 'start_application') return;

    try {
        const config = await ApplicationConfig.findOne({ guildId: interaction.guildId });
        if (!config || !config.enabled || !config.questions || config.questions.length === 0) {
            return interaction.reply({ embeds: [createErrorEmbed('The application system is not fully configured yet.')], ephemeral: true });
        }

        const hasPending = await ApplicationRequest.findOne({ guildId: interaction.guildId, userId: interaction.user.id, status: 'pending' });
        if (hasPending) {
            return interaction.reply({ embeds: [createErrorEmbed('You already have a pending application. Please wait for it to be reviewed.')], ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId('apply_modal_submit')
            .setTitle(config.panelTitle ? String(config.panelTitle).substring(0, 45) : 'Server Application');

        const activeQuestions = config.questions.slice(0, 5); // Strict Discord 5-item limit
        const inputs = activeQuestions.map((q, i) => {
            return new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId(`question_${i}`)
                    .setLabel(q ? String(q).substring(0, 45) : `Question ${i + 1}`) // Discord limits labels to 45 chars
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
            );
        });

        modal.addComponents(...inputs);
        await interaction.showModal(modal);

    } catch (e) {
        console.error("FATAL APPLY ERROR:", e);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ **Failed to open Modal! Internal Error:**\n\`\`\`js\n${e.stack || e.message}\n\`\`\``,
                ephemeral: true
            }).catch(() => { });
        }
    }
}

async function handleModalSubmit(interaction) {
    if (interaction.customId !== 'apply_modal_submit') return;

    try {
        await interaction.deferReply({ ephemeral: true });

        const config = await ApplicationConfig.findOne({ guildId: interaction.guildId });
        if (!config) return interaction.editReply({ embeds: [createErrorEmbed('Configuration error.')] });

        const activeQuestions = config.questions.slice(0, 5);
        const answers = activeQuestions.map((q, i) => {
            return {
                question: q,
                answer: interaction.fields.getTextInputValue(`question_${i}`)
            };
        });

        const request = new ApplicationRequest({
            guildId: interaction.guildId,
            userId: interaction.user.id,
            username: interaction.user.username,
            answers: answers
        });

        await request.save();

        const reviewChannel = await interaction.guild.channels.fetch(config.reviewChannelId).catch(() => null);
        if (!reviewChannel) {
            return interaction.editReply({ embeds: [createErrorEmbed('Review channel not found. The application was saved but staff could not be notified.')] });
        }

        const embed = createCoolEmbed({
            title: `📝 New Application from ${interaction.user.username}`,
            color: 'warning',
            thumbnail: interaction.user.displayAvatarURL()
        });

        answers.forEach((ans, i) => {
            embed.addFields({ name: `${i + 1}. ${ans.question}`, value: `> ${ans.answer}` });
        });

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`apply_accept_${request._id}`).setLabel('Accept').setStyle(ButtonStyle.Success).setEmoji('✅'),
            new ButtonBuilder().setCustomId(`apply_deny_${request._id}`).setLabel('Deny').setStyle(ButtonStyle.Danger).setEmoji('❌')
        );

        const ping = config.reviewerRoleId ? `<@&${config.reviewerRoleId}>` : '';
        const reviewMsg = await reviewChannel.send({ content: ping, embeds: [embed], components: [actionRow] });

        request.pendingMessageId = reviewMsg.id;
        await request.save();

        await interaction.editReply({ embeds: [createSuccessEmbed('Application Submitted', 'Your application has been successfully submitted to the staff team for review!')] });
    } catch (e) {
        console.error("MODAL SUBMIT ERROR:", e);
        const errorMessage = `❌ **Failed to process application!**\n\`\`\`js\n${e.stack || e.message}\n\`\`\``;
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: errorMessage }).catch(() => { });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true }).catch(() => { });
        }
    }
}

async function handleReviewAction(interaction) {
    if (!interaction.customId.startsWith('apply_accept_') && !interaction.customId.startsWith('apply_deny_')) return;
    await interaction.deferUpdate();

    const isAccept = interaction.customId.startsWith('apply_accept_');
    const requestId = interaction.customId.split('_')[2];

    const request = await ApplicationRequest.findById(requestId);
    if (!request) return interaction.followUp({ content: 'Application not found in database.', ephemeral: true });

    if (request.status !== 'pending') {
        return interaction.followUp({ content: 'This application has already been reviewed.', ephemeral: true });
    }

    request.status = isAccept ? 'accepted' : 'denied';
    await request.save();

    // Disable buttons on the review message
    const components = interaction.message.components[0].components.map(c =>
        ButtonBuilder.from(c).setDisabled(true)
    );
    const newRow = new ActionRowBuilder().addComponents(components);

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(isAccept ? '#43b581' : '#f04747')
        .setTitle(`${isAccept ? '✅ Accepted' : '❌ Denied'} Application from ${request.username}`)
        .setFooter({ text: `Reviewed by ${interaction.user.tag}` });

    await interaction.message.edit({ embeds: [embed], components: [newRow] });

    // DM the user
    try {
        const member = await interaction.guild.members.fetch(request.userId);
        const dmEmbed = createCoolEmbed({
            title: `Your Application Status: ${isAccept ? 'Accepted 🎉' : 'Denied 😔'}`,
            description: `Your application in **${interaction.guild.name}** has been reviewed.`,
            color: isAccept ? 'success' : 'error'
        });
        await member.send({ embeds: [dmEmbed] });
    } catch (e) {
        // Cannot DM user
    }
}

module.exports = { handleApplyButton, handleModalSubmit, handleReviewAction };
