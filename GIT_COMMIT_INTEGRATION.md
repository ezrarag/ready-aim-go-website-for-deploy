feat: implement integration panel with finances and chatbot controls

- Rename "Mission Information" to "Integration Panel" in Command Center
- Add Finances integration with radio button control (off by default)
- Add Chatbot integration with radio button control (off by default)
- Implement payment modal trigger when enabling Finances integration
- Add conditional greying of Encrypted Chat Activity Center when chatbot disabled
- Remove redirects from integration panel buttons (no more operators tab navigation)
- Add integration state management for finances and chatbot toggles
- Update payment modal to handle both subscription and integration payments
- Add disabled state styling and messaging for chat area

Files modified:
- app/dashboard/client/page.tsx - Added integration panel with state management
- TODO.md - Updated with integration panel implementation

The integration panel now provides granular control over system features,
allowing users to enable/disable specific integrations as needed. 