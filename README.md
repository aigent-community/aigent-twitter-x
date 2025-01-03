# aigent-twitter-x

A modern web application that lets you chat with AI-powered personas based on Twitter/X personalities. The AI will respond in the style and character of the selected personality, using their typical phrases, topics, and mannerisms.

## Features

- 🎭 Multiple AI Personas
  - Choose from different Twitter personalities
  - Each persona has unique characteristics and topics
  - Responses match the personality's writing style
  - Links to original Twitter accounts

- 💬 Chat Interface
  - Clean, modern UI with dark/light mode
  - Real-time conversation
  - Message history with timestamps
  - Token usage tracking
  - Clear conversation option

- 🔒 Privacy-Focused
  - Local storage for chat history
  - API keys stored securely in your browser
  - No server-side data storage
  - All conversations stay on your device

- 🛠️ User-Friendly Setup
  - Simple API key management
  - Easy persona switching
  - Search functionality for personas
  - Responsive design for all devices

## Tech Stack

- React + TypeScript for robust frontend development
- Vite for fast development and building
- Tailwind CSS for modern styling
- Anthropic's Claude AI for natural conversations
- Local Storage for data persistence

## Getting Started

1. Clone the repository
2. Install dependencies with `bun install`
3. Start the development server with `bun run dev`
4. Add your Anthropic API key in the settings (click the key icon)

## How to Use

1. **Set Up API Key**
   - Click the key icon in the sidebar
   - Enter your Anthropic API key
   - Save to start chatting

2. **Choose a Persona**
   - Browse available personas in the sidebar
   - Use the search bar to filter personas
   - Click on a persona to start chatting

3. **Chat Features**
   - Type your message and press Enter to send
   - Each AI response matches the persona's style
   - Click persona's @ handle to view their Twitter profile
   - Use the clear button to reset the conversation
   - Monitor token usage in real-time

4. **Customization**
   - Toggle between light/dark mode
   - Chat history is saved per persona
   - Conversations persist between sessions

## Contributing

Feel free to contribute to this project by:
- Adding new personas to `personas-db.json`
- Improving UI/UX
- Adding new features
- Fixing bugs

## License

MIT License - feel free to use this project however you'd like!