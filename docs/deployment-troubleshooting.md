# Step 15: Deployment and Troubleshooting

This section provides detailed instructions for handling common deployment issues, particularly focusing on TypeScript dependencies when deploying to Netlify.

## Ensuring All Dependencies Are Properly Specified

### Package.json Configuration

Make sure your `package.json` file includes all necessary dependencies:

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.18.0",
    "@react-pdf/renderer": "^3.3.8",
    "autoprefixer": "^10.4.21",
    "next": "14.1.0",
    "postcss": "^8.5.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hot-toast": "^2.5.2",
    "recharts": "^2.15.2",
    "tailwindcss": "^3.4.17"
  },
  "devDependencies": {
    "@netlify/plugin-nextjs": "^5.10.4",
    "@types/node": "^20.11.19",
    "@types/react": "^18.2.57",
    "@types/react-dom": "^18.2.19",
    "eslint": "^8.56.0",
    "eslint-config-next": "14.1.0",
    "typescript": "^5.3.3"
  }
}
```

### Key Points:

1. **TypeScript Dependencies**: Ensure TypeScript and React type definitions are in `devDependencies`:
   - `typescript`
   - `@types/node`
   - `@types/react`
   - `@types/react-dom`

2. **CSS Dependencies**: For Tailwind CSS, include these in `dependencies` (not `devDependencies`):
   - `tailwindcss`
   - `autoprefixer`
   - `postcss`

3. **Next.js Plugin**: Include the Netlify Next.js plugin in `devDependencies`:
   - `@netlify/plugin-nextjs`

## Fixing TypeScript Dependency Errors

### Common TypeScript Errors

1. **Missing Type Definitions**:
   ```
   Error: Cannot find module '@types/react' or its corresponding type declarations.
   ```

   **Solution**: Install the missing type definitions:
   ```bash
   npm install --save-dev @types/react @types/react-dom @types/node
   ```

2. **TypeScript Compilation Errors**:
   ```
   Error: TypeScript compilation failed
   ```

   **Solution**: Ensure TypeScript is installed and properly configured:
   ```bash
   npm install --save-dev typescript
   ```

3. **Module Resolution Errors**:
   ```
   Error: Cannot find module 'react' or its corresponding type declarations.
   ```

   **Solution**: Check your `tsconfig.json` file and ensure it includes the correct paths:
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./*"]
       }
     }
   }
   ```

## Configuring Netlify for Next.js Applications

### Netlify Configuration (netlify.toml)

```toml
[build]
  command = "npm install --production=false && npm run build"
  publish = "out"
  functions = "netlify/functions"

[build.environment]
  NODE_ENV = "production"
  NEXT_TELEMETRY_DISABLED = "1"
  NPM_FLAGS = "--legacy-peer-deps"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
  external_node_modules = ["@anthropic-ai/sdk"]
```

### Key Configuration Points:

1. **Build Command**: Use `npm install --production=false` to ensure dev dependencies are installed
2. **Publish Directory**: Set to `out` for static exports
3. **Functions Directory**: Set to `netlify/functions` for serverless functions
4. **Environment Variables**: Set `NODE_ENV` to `production` and disable Next.js telemetry
5. **Plugins**: Include the Netlify Next.js plugin
6. **Redirects**: Configure API routes to use Netlify functions

## Environment Variable Setup

### Setting Environment Variables in Netlify

1. **In the Netlify Dashboard**:
   - Go to Site settings > Build & deploy > Environment variables
   - Add the following variables:
     ```
     CLAUDE_API_KEY=your_actual_api_key
     NEXT_PUBLIC_CLAUDE_API_KEY=your_actual_api_key
     ```

2. **In netlify.toml**:
   ```toml
   [build.environment]
     CLAUDE_API_KEY = ""
     NEXT_PUBLIC_CLAUDE_API_KEY = ""
   ```
   (Leave the values empty in the file, they will be overridden by the dashboard settings)

### Local Development (.env.local)

Create a `.env.local` file in your project root:
```
CLAUDE_API_KEY=your_actual_api_key
NEXT_PUBLIC_CLAUDE_API_KEY=your_actual_api_key
```

## Troubleshooting Common Deployment Failures

### 1. Missing Dependencies

**Error**: `Cannot find module 'tailwindcss'`

**Solution**:
- Move the dependency from `devDependencies` to `dependencies` in `package.json`
- Update the build command to install all dependencies: `npm install --production=false && npm run build`

### 2. TypeScript Compilation Errors

**Error**: `TypeScript compilation failed`

**Solution**:
- Ensure TypeScript and type definitions are installed: `npm install --save-dev typescript @types/react @types/react-dom @types/node`
- Check your `tsconfig.json` file for errors
- Update the build command to install dev dependencies

### 3. Next.js Configuration Issues

**Error**: `Invalid next.config.js options detected`

**Solution**:
- Remove outdated options from `next.config.js`
- Update to the latest version of Next.js
- Ensure the Netlify Next.js plugin is up to date

### 4. API Route Issues

**Error**: `API route not found`

**Solution**:
- Check your `netlify.toml` redirects configuration
- Ensure your API routes are properly set up in the `netlify/functions` directory
- Verify that the Netlify Next.js plugin is correctly configured

## Pre-Deployment Testing Checklist

Before deploying to Netlify, run through this checklist:

1. **Local Build Test**:
   ```bash
   npm run build
   ```
   Ensure the build completes without errors

2. **TypeScript Check**:
   ```bash
   npx tsc --noEmit
   ```
   Verify there are no TypeScript errors

3. **Lint Check**:
   ```bash
   npm run lint
   ```
   Fix any linting issues

4. **Dependency Check**:
   ```bash
   npm ls
   ```
   Ensure all dependencies are properly installed

5. **Environment Variables**:
   - Verify all required environment variables are set in `.env.local`
   - Check that sensitive variables are not committed to the repository

6. **Netlify Configuration**:
   - Review `netlify.toml` for any errors
   - Ensure the build command is correct
   - Verify the publish directory is set correctly

7. **API Routes**:
   - Test API routes locally using `netlify dev`
   - Ensure they're properly configured in `netlify/functions`

8. **Static Files**:
   - Check that all static files are in the correct location
   - Verify that they're included in the build

By following these guidelines and troubleshooting steps, you should be able to successfully deploy your Next.js application to Netlify and resolve common deployment issues. 