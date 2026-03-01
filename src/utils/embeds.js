const { EmbedBuilder } = require('discord.js');

const EMBED_COLORS = {
    primary: '#7289da',
    success: '#43b581',
    error: '#f04747',
    warning: '#faa61a',
    info: '#3498db',
    premium: '#ff73fa',
    enterprise: '#f1c40f',
    dark: '#2f3136'
};



/**
 * Creates a base "cool" embed with consistent branding.
 * @param {Object} options Options for the embed
 * @param {string} options.title The embed title
 * @param {string} [options.description] The embed description
 * @param {string} [options.color] The embed color (hex or standard color name)
 * @param {Object} [options.author] The author object { name, iconURL, url }
 * @param {string} [options.thumbnail] Thumbnail URL
 * @param {string} [options.image] Main image URL
 * @param {Object} [options.branding] Custom branding overrides { color, footer, iconURL }
 * @returns {EmbedBuilder}
 */
/**
 * Asynchronously generates a branded embed by fetching guild settings
 * @param {Object} interaction The discord interaction or message object
 * @param {Object} options Options for the embed
 * @returns {Promise<EmbedBuilder>}
 */
async function createCustomEmbed(interaction, options = {}) {
    let guildBranding = {};

    if (interaction && interaction.guildId) {
        try {
            const { Guild } = require('../database/mongo');
            const guildData = await Guild.findOne({ guildId: interaction.guildId }).lean();
            if (guildData?.customBranding) {
                guildBranding = guildData.customBranding;
            }
        } catch (e) {
            console.error('Failed to fetch guild branding for embeds', e);
        }
    }

    if (!options.branding) options.branding = {};

    // Server theme overrides default styling if present
    if (guildBranding.color) options.branding.color = guildBranding.color;
    if (guildBranding.footer) options.branding.footer = guildBranding.footer;
    if (guildBranding.iconURL) options.branding.iconURL = guildBranding.iconURL;

    return createCoolEmbed(options);
}

function createCoolEmbed(options = {}) {
    const embed = new EmbedBuilder();

    const branding = options.branding || {};

    // Set color
    let color = EMBED_COLORS.primary;
    if (branding.color) {
        color = branding.color;
    } else if (options.color) {
        color = EMBED_COLORS[options.color] || options.color;
    }
    embed.setColor(color);

    // Handle Custom Branding Footer
    const footerText = branding.footer || null;
    const footerIcon = branding.iconURL || null;

    if (footerText && footerIcon) {
        embed.setFooter({ text: footerText, iconURL: footerIcon });
    } else if (footerText) {
        embed.setFooter({ text: footerText });
    } else if (footerIcon) {
        embed.setFooter({ text: '\u200B', iconURL: footerIcon }); // Discord requires text if iconURL is set
    }

    embed.setTimestamp();

    // Set content
    if (options.title) embed.setTitle(options.title);
    if (options.description) embed.setDescription(options.description);

    if (options.author) {
        const authorData = { name: options.author.name };
        if (options.author.iconURL) authorData.iconURL = options.author.iconURL;
        if (options.author.url) authorData.url = options.author.url;
        embed.setAuthor(authorData);
    }

    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.image) embed.setImage(options.image);

    return embed;
}

/**
 * Creates an error embed
 */
function createErrorEmbed(message) {
    return createCoolEmbed({
        title: '❌ Error',
        description: message,
        color: 'error'
    });
}

/**
 * Creates a success embed
 */
function createSuccessEmbed(title, message) {
    return createCoolEmbed({
        title: title || '✅ Success',
        description: message,
        color: 'success'
    });
}

/**
 * Creates a premium-styled embed
 */
function createPremiumEmbed(options = {}) {
    return createCoolEmbed({
        ...options,
        color: 'premium',
        title: options.title ? `✨ ${options.title}` : '✨ Premium Feature'
    });
}

/**
 * Creates an enterprise-styled embed
 */
function createEnterpriseEmbed(options = {}) {
    return createCoolEmbed({
        ...options,
        color: 'enterprise',
        title: options.title ? `👑 ${options.title}` : '👑 Enterprise Feature'
    });
}

module.exports = {
    EMBED_COLORS,
    createCoolEmbed,
    createCustomEmbed,
    createErrorEmbed,
    createSuccessEmbed,
    createPremiumEmbed,
    createEnterpriseEmbed
};
