feat: implement real Slack and GitHub integration with enhanced error handling

- Add real Slack API integration with connection status indicators
- Enhance GitHub service to fetch real TODO.md files from repositories  
- Fix file search from TODO.me to TODO.md (correct extension)
- Add comprehensive error handling with graceful fallbacks
- Create service configuration system with environment variables
- Implement client login functionality in website modal
- Add debugging and monitoring with detailed console logs
- Update UI with status badges and loading indicators
- Create API_SETUP.md with detailed configuration guide

Breaking changes:
- Changed GitHub file search from TODO.me to TODO.md
- Removed static mock data from GitHub service
- Added new environment variables for API tokens

Files added:
- lib/services/slack-service.ts
- lib/config/services.ts  
- components/debug-info.tsx
- API_SETUP.md

Files modified:
- lib/services/github-service.ts
- components/website-card-modal.tsx
- hooks/use-revenue-data.ts
- env.example
- TODO.md 