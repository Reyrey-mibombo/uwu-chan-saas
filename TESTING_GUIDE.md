# 🧪 Command Testing Guide

## Pre-Deployment Testing Checklist

### Step 1: Environment Variables
Ensure your `.env` file has all required variables:

```env
# Required
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_bot_client_id_here
MONGODB_URI=your_mongodb_connection_string_here

# Optional but recommended
ENABLED_TIERS=v1,v1_context,buying,v2,v3,v4,v5,v6,v7,v8,premium
TEST_GUILD_ID=your_test_server_id  # Remove for production
NODE_ENV=development  # Set to 'production' for live deployment
```

### Step 2: Start the Bot

```bash
npm install  # Install dependencies if not done
npm start    # Start the bot
```

Watch the console output for these key messages:

```
✓ [Commands] Auto-injected v1_context for context menu support
✓ [Commands] Loading X commands from v1...
✓ [Commands] ✓ Loaded v1/filename.js: /commandname
✓ [Commands] Total loaded: 271 commands
✓ [Commands] Breakdown by version: { v1: 34, v1_context: 2, buying: 3, v2: 42, ... }
✓ [Guild] Startup guild sync complete.
```

If you see errors or warnings, address them before continuing.

### Step 3: Run the Diagnostic Command

In your Discord server, run:
```
/bot_debug
```

**Expected Output:**
- Bot Status: ✅ All systems operational
- Database: ✅ Connected
- Commands Loaded: 271+
- Server: ✅ Registered
- Issues Detected: None (or specific issues listed)

### Step 4: Test Commands by Category

#### V1 - Base Commands (Free Tier)
- [ ] `/ping` - Should show latency stats
- [ ] `/help` - Should show help menu
- [ ] `/shift_start` - Should start a shift
- [ ] `/shift_end` - Should end current shift
- [ ] `/staff_profile` - Should show staff profile
- [ ] `/leaderboard` - Should show points leaderboard
- [ ] `/warn @user` - Should issue a warning
- [ ] `/buy` - Should show pricing (NEW - previously broken!)

#### V1 Context - Context Menu Commands (Free Tier)
- [ ] Right-click user → Apps → "Quick Warn" - Should open warn modal
- [ ] Right-click user → Apps → "View Staff Profile" - Should show profile

#### V2 - Staff Tools (Free Tier)
- [ ] `/activity_alert` - Should configure alerts
- [ ] `/points` - Should show points info
- [ ] `/profile_card` - Should show profile card

#### V3-V5 - Premium Commands
- [ ] `/premium` - Should show premium info
- [ ] `/set_requirements_premium` - Should configure requirements
- [ ] `/staff_efficiency` - Should show efficiency stats

#### V6-V8 - Enterprise Commands
- [ ] `/enterprise` - Should show enterprise info
- [ ] `/server_health` - Should show server health
- [ ] `/automation_pulse` - Should show automation status

### Step 5: Error Handling Tests

Test that errors are handled gracefully:

1. **Test Permission Errors:**
   - Have a non-admin user try `/bot_debug` (should fail with permission error)

2. **Test Database Disconnection:**
   - Temporarily disconnect MongoDB and try a command
   - Should show "Database Error" message, not crash

3. **Test Invalid Command:**
   - Type a non-existent command
   - Should show "command is not available" message

### Step 6: Cross-Server Testing

If the bot is in multiple servers:

1. **Test in Server A:**
   - Run `/bot_debug`
   - Verify server shows as "Registered"

2. **Test in Server B:**
   - Run `/bot_debug`
   - Verify server shows as "Registered"

3. **Check Command Consistency:**
   - Commands should behave identically in both servers

### Step 7: Log Verification

Check your logs for these patterns:

**Good Signs:**
```
[Command] /ping called by User#1234 (123456789) in guild 987654321
[Command] Command version tier: v1
[Command] Access check result: allowed=true
[Command] Execution successful
```

**Warning Signs:**
```
[Command] Unknown command: somecommand
[VERSION] Guild X not found in database
[Command] Execution error: ...
```

## Common Test Failures & Solutions

### Test Fails: "Command not appearing"
**Cause:** Discord command propagation delay
**Solution:** 
- Set `TEST_GUILD_ID` for instant updates during testing
- Or wait up to 1 hour for global propagation

### Test Fails: "Server Not Registered"
**Cause:** Guild not in database
**Solution:**
- Check `/bot_debug` output
- If not registered, kick and re-invite the bot
- Or wait for the startup guild sync to complete

### Test Fails: "Interaction has not been deferred"
**Cause:** Command uses `editReply()` without `deferReply()`
**Solution:** This was fixed in the context menu commands. If you see this elsewhere, report it as a bug.

### Test Fails: "Database Error"
**Cause:** MongoDB connection issue
**Solution:**
- Check `MONGODB_URI` is correct
- Verify MongoDB is accessible from the bot's network
- Check database user permissions

## Post-Test Deployment

After all tests pass:

1. Set `NODE_ENV=production`
2. Remove `TEST_GUILD_ID` (unless using specific guild testing)
3. Restart the bot
4. Run `/bot_debug` one final time
5. Monitor logs for the first 30 minutes after deployment

## Rollback Plan

If issues occur after deployment:

1. Check logs immediately for error messages
2. Run `/bot_debug` to identify the issue
3. If critical, restore from backup and restart
4. Check the `COMMAND_DEBUG_FIXES.md` for known issues

## Need Help?

If tests fail and you can't resolve:

1. Copy the error message from logs
2. Run `/bot_debug` and screenshot the output
3. Check `COMMAND_DEBUG_FIXES.md` for the specific issue
4. Review the GitHub issues for similar problems
