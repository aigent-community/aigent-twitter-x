# aigent-twitter-x

This project is a social agent that allows to communicate with one of the selected and supported accounts on Twitter X. This agent will act like a human will respond to all of your questions like the impersonated account.

## Tech stack

- React
- Vite
- TypeScript
- Anthropic API

## How to use

1. File `personas-db.json` contains all of the supported accounts. You can add your own account to this file.
2. Open this agent in your browser and start chatting with the selected account.
3. Use select button to select the account you want to chat with.
  3.1. Each chat message of impersonated account will be marked with `@` symbol and should have a link to the origin account.
4. Use `clear` button to clear the conversation history.
5. Check the conversation stats to see how many tokens are used and how many are left.