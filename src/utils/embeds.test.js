const { EmbedBuilder } = require('discord.js');
const embeds = require('./embeds');

describe('Embeds Utility Factory', () => {
    it('should create a base embed with default primary color', () => {
        const embed = embeds.createCoolEmbed({
            title: 'Test Title',
            description: 'Test Description'
        });

        expect(embed).toBeInstanceOf(EmbedBuilder);
        // discord.js EmbedBuilder .data object contains the raw structure
        expect(embed.data.title).toBe('Test Title');
        expect(embed.data.description).toBe('Test Description');

        // Assert standard components
        expect(embed.data.footer.text).toContain('UwU Chan SaaS');
        expect(embed.data.color).toBe(parseInt(embeds.EMBED_COLORS.primary.replace('#', ''), 16));
    });

    it('should create an error embed with the error color', () => {
        const embed = embeds.createErrorEmbed('Something went wrong!');

        expect(embed.data.title).toBe('❌ Error');
        expect(embed.data.description).toBe('Something went wrong!');
        expect(embed.data.color).toBe(parseInt(embeds.EMBED_COLORS.error.replace('#', ''), 16));
    });

    it('should create a premium embed with custom footer', () => {
        const embed = embeds.createPremiumEmbed({ title: 'Premium Hub' });

        expect(embed.data.title).toBe('✨ Premium Hub');
        expect(embed.data.footer.text).toContain('Premium Tier 💎');
        expect(embed.data.color).toBe(parseInt(embeds.EMBED_COLORS.premium.replace('#', ''), 16));
    });
});
