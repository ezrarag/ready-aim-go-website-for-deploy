feat: implement dynamic activity log and improve integration panel

- Remove extra buttons from Payment and Chatbot toggle switches (click to toggle)
- Make Agent Allocation card blurred until subscription payment is made
- Create useActivityLog hook for fetching real data from Supabase
- Integrate Stripe revenue events, project updates, and system logs
- Update Activity Log card to use dynamic data instead of static mock
- Add loading states and error handling for activity log
- Enhance Encrypted Chat Activity with AI assistant messages
- Add conditional AI messages for revenue, commission, and site traffic
- Implement proper data flow from Stripe webhooks to activity log

Files modified:
- app/dashboard/client/page.tsx - Updated integration panel and activity log
- hooks/use-activity-log.ts - New hook for dynamic activity data
- TODO.md - Updated with new features

The activity log now shows real transactions and system events,
while the integration panel provides better visual feedback for
subscription-dependent features. 