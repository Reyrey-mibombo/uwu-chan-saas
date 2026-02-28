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

const FOOTER_TEXT = 'UwU Chan SaaS • Premium Experience 💖';

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

    // Set standard footer
    const footerText = branding.footer || FOOTER_TEXT;
    const footerIcon = branding.iconURL || null;

    if (footerIcon) {
        embed.setFooter({ text: footerText, iconURL: footerIcon });
    } else {
        embed.setFooter({ text: footerText });
    }

    embed.setTimestamp();

    // Set content
    if (options.title) embed.setTitle(options.title);
    if (options.description) embed.setDescription(options.description);

    if (options.author) {
        embed.setAuthor({
            name: options.author.name,
            iconURL: options.author.iconURL,
            url: options.author.url
        });
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
    }).setFooter({ text: 'UwU Chan SaaS • Premium Tier 💎' });
}

/**
 * Creates an enterprise-styled embed
 */
function createEnterpriseEmbed(options = {}) {
    return createCoolEmbed({
        ...options,
        color: 'enterprise',
        title: options.title ? `👑 ${options.title}` : '👑 Enterprise Feature'
    }).setFooter({ text: 'UwU Chan SaaS • Enterprise Tier 🏢' });
}

module.exports = {
    EMBED_COLORS,
    createCoolEmbed,
    createErrorEmbed,
    createSuccessEmbed,
    createPremiumEmbed,
    createEnterpriseEmbed
};
