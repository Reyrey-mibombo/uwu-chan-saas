const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

try {
    const questions = [
        "Why do you want to join our team?",
        "What experience do you have?",
        "How active can you be?",
        "[object Object]",
        "[object Object]"
    ];

    const modal = new ModalBuilder()
        .setCustomId('apply_modal_submit')
        .setTitle('Server Application');

    const inputs = questions.map((q, i) => {
        return new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId(`question_${i}`)
                .setLabel(String(q).substring(0, 45)) // Discord limits labels to 45 chars
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
        );
    });

    modal.addComponents(...inputs);
    // Convert to JSON to see if discord.js validation throws internally
    console.log(JSON.stringify(modal.toJSON(), null, 2));
    console.log("Modal built successfully!");
} catch (e) {
    console.error("FAILED TO BUILD MODAL:", e);
}
