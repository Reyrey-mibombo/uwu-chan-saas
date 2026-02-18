const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const v1Commands = [
  'activity_chart', 'activity_log', 'check_activity', 'check_permissions', 
  'daily_summary', 'feedback', 'help', 'invite_link', 'leaderboard', 
  'mod_notes', 'monthly_summary', 'notes', 'ping', 'report_issue', 
  'roles_list', 'server_info', 'server_rules', 'shift_end', 'shift_start', 
  'staff_profile', 'staff_rank', 'staff_stats', 'timezone', 'uptime', 'warn'
];

const v2Commands = [
  'activity_alert', 'alert_system', 'auto_reminder', 'auto_rewards', 
  'bonus_points', 'check_logs', 'consistency', 'leaderboard_summary', 
  'notify_staff', 'points', 'progress_report', 'promotion_predict', 
  'promotion_requirements', 'promotion_status', 'rank_predict', 
  'reputation', 'reward_points', 'schedule_check', 'shift_alerts', 
  'staff_goal', 'staff_score', 'task_assign', 'task_completion', 
  'time_tracking', 'weekly_report'
];

const v3Commands = [
  'achievement_tracker', 'advanced_logs', 'alert_summary', 'attendance_summary',
  'auto_assign_roles', 'auto_remind', 'bonus_allocation', 'daily_insights',
  'detailed_profile', 'efficiency_chart', 'leaderboards', 'mod_notes_advanced',
  'monthly_insights', 'performance_score', 'premium_stats', 'priority_alerts',
  'promotion_history', 'promotion_predictor', 'reward_summary', 'role_assign',
  'shift_optimizer', 'staff_efficiency', 'staff_rank_advanced', 'task_optimizer',
  'task_reassign'
];

const v4Commands = [
  'activity_summary', 'analytics_summary', 'automation_overview', 'auto_promotion_visual',
  'bonus_tracker', 'bonus_visual', 'elite_badges', 'elite_rewards', 'elite_showcase',
  'event_visuals', 'growth_forecast', 'growth_visuals', 'interactive_dashboard',
  'interactive_summary', 'leaderboard_visual', 'milestone_effects', 'milestone_tracker',
  'notification_effect', 'performance_visual', 'prediction_graph', 'prediction_summary',
  'premium_effects', 'premium_unlock', 'progress_animation', 'progress_chart',
  'progress_notify', 'progress_summary', 'promotion_announce', 'promotion_flow',
  'rank_animation', 'rank_display', 'rank_upgrade', 'reward_display', 'reward_flow',
  'season_rewards', 'season_summary', 'server_heatmap', 'smart_recommendation',
  'staff_highlight', 'staff_recognition', 'staff_showcase', 'team_highlights',
  'trend_visuals', 'visual_feedback', 'visual_leaderboard', 'visual_rankings'
];

const v5Commands = [
  'achievement_chart', 'achievement_leaderboard', 'achievement_rewards',
  'achievement_tracker_visual', 'activity_graph', 'alert_system', 'auto_assign',
  'auto_promotion', 'auto_rank_up', 'auto_rewards', 'automation_report',
  'automation_settings', 'auto_task', 'bonus_summary', 'daily_bonus',
  'event_rewards', 'milestone_summary', 'notification_log', 'progress_tracker',
  'rank_announce', 'rank_chart', 'rank_summary', 'reward_logs', 'reward_points',
  'reward_prediction', 'smart_alerts', 'smart_notifications', 'task_alerts',
  'weekly_bonus'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands'),

  async execute(interaction, client) {
    const v1List = v1Commands.map(c => `\`&${c}\``).join(', ');
    const v2List = v2Commands.map(c => `\`&${c}\``).join(', ');
    
    const embed = new EmbedBuilder()
      .setTitle('🤖 Uwu-chan Bot Commands')
      .setColor(0x3498db)
      .setDescription('Use `&` prefix to run commands\n\n**FREE:** v1, v2\n**PREMIUM:** v3, v4, v5\n**ENTERPRISE:** v6, v7, v8')
      .addFields(
        { name: '🔹 v1 Commands (FREE) - 25 commands', value: v1List, inline: false },
        { name: '🔹 v2 Commands (FREE) - 25 commands', value: v2List, inline: false },
        { name: '💎 v3 Commands (Premium) - 25 commands', value: '🔒 Use `/premium` to unlock', inline: false },
        { name: '💎 v4 Commands (Premium) - 49 commands', value: '🔒 Use `/premium` to unlock', inline: false },
        { name: '💎 v5 Commands (Premium) - 29 commands', value: '🔒 Use `/premium` to unlock', inline: false },
        { name: '🌟 v6-v8 Commands (Enterprise)', value: '🔒 Use `/premium` to upgrade to Enterprise', inline: false },
        { name: '💎 Premium Slash Commands', value: '`/premium` - View plans\n`/buy` - Purchase\n`/activate` - Activate', inline: false }
      )
      .setFooter({ text: 'Uwu-chan Bot - v1 & v2 are FREE!' });

    await interaction.reply({ embeds: [embed] });
  }
};
