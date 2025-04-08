# Wine Sales Performance Evaluator

A Next.js application for evaluating wine sales performance through conversation analysis.

## Features

- Markdown file upload and analysis
- PDF report generation
- Detailed performance metrics
- Interactive dashboard
- Claude AI-powered analysis

## Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- Claude API key

## Environment Variables

Create a `.env.local` file in the root directory with:

```
CLAUDE_API_KEY=your_claude_api_key_here
```

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Netlify

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Configure the following build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
4. Add your environment variables in Netlify's dashboard
5. Deploy!

## Project Structure

- `/app` - Next.js app directory
- `/components` - React components
- `/public` - Static assets
- `/types` - TypeScript type definitions

## Technologies Used

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- @react-pdf/renderer
- Claude AI API

## License

ISC 