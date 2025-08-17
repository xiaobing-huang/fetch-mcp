# Fetch MCP Server

![fetch mcp logo](logo.jpg)

This MCP server provides functionality to fetch web content in various formats, including HTML, JSON, plain text, and Markdown.

<a href="https://glama.ai/mcp/servers/nu09wf23ao">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/nu09wf23ao/badge" alt="Fetch Server MCP server" />
</a>

## Components

### Tools

- **fetch_html**
  - Fetch a website and return the content as HTML
  - Input:
    - `url` (string, required): URL of the website to fetch
    - `headers` (object, optional): Custom headers to include in the request
    - `max_length` (number, optional): Maximum number of characters to return (default: 5000)
    - `start_index` (number, optional): Start content from this character index (default: 0)
    - `proxy` (object, optional): Proxy configuration (see [Proxy Configuration](#proxy-configuration))
  - Returns the raw HTML content of the webpage

- **fetch_json**
  - Fetch a JSON file from a URL
  - Input:
    - `url` (string, required): URL of the JSON to fetch
    - `headers` (object, optional): Custom headers to include in the request
    - `max_length` (number, optional): Maximum number of characters to return (default: 5000)
    - `start_index` (number, optional): Start content from this character index (default: 0)
    - `proxy` (object, optional): Proxy configuration (see [Proxy Configuration](#proxy-configuration))
  - Returns the parsed JSON content

- **fetch_txt**
  - Fetch a website and return the content as plain text (no HTML)
  - Input:
    - `url` (string, required): URL of the website to fetch
    - `headers` (object, optional): Custom headers to include in the request
    - `max_length` (number, optional): Maximum number of characters to return (default: 5000)
    - `start_index` (number, optional): Start content from this character index (default: 0)
    - `proxy` (object, optional): Proxy configuration (see [Proxy Configuration](#proxy-configuration))
  - Returns the text content of the webpage with HTML tags, scripts, and styles removed

- **fetch_markdown**
  - Fetch a website and return the content as Markdown
  - Input:
    - `url` (string, required): URL of the website to fetch
    - `headers` (object, optional): Custom headers to include in the request
    - `max_length` (number, optional): Maximum number of characters to return (default: 5000)
    - `start_index` (number, optional): Start content from this character index (default: 0)
    - `proxy` (object, optional): Proxy configuration (see [Proxy Configuration](#proxy-configuration))
  - Returns the content of the webpage converted to Markdown format

### Resources

This server does not provide any persistent resources. It's designed to fetch and transform web content on demand.

## Getting started

### Prerequisites
- Node.js 16+ (for `node-fetch` compatibility)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
   - This includes `node-fetch` for HTTP requests with proxy support
   - Also includes `https-proxy-agent` for enterprise proxy functionality
3. Build the server: `npm run build`

### Usage

To use the server, you can run it directly:

```bash
npm start
```

This will start the Fetch MCP Server running on stdio.

### Usage with Desktop App

To integrate this server with a desktop app, add the following to your app's server configuration:

```json
{
  "mcpServers": {
    "fetch": {
      "command": "node",
      "args": [
        "{ABSOLUTE PATH TO FILE HERE}/dist/index.js"
      ]
    }
  }
}
```

## Proxy Configuration

The Fetch MCP Server supports proxy configuration for enterprise environments and restricted networks. You can configure proxies using environment variables or explicit configuration in tool calls.

### Environment Variables

The server automatically detects and uses standard proxy environment variables:

#### Basic Proxy Configuration
```bash
# For HTTP requests
export HTTP_PROXY=http://proxy.company.com:8080

# For HTTPS requests (takes precedence over HTTP_PROXY for HTTPS URLs)
export HTTPS_PROXY=http://proxy.company.com:8080

# Bypass proxy for specific domains
export NO_PROXY=localhost,127.0.0.1,*.internal.com,.local
```

#### Proxy with Authentication
```bash
export HTTPS_PROXY=http://username:password@proxy.company.com:8080
```

#### Case Insensitive Support
Both uppercase and lowercase environment variables are supported:
```bash
export https_proxy=http://proxy.company.com:8080
export no_proxy=localhost,*.internal.com
```

### Explicit Proxy Configuration

You can also specify proxy settings directly in tool calls, which takes precedence over environment variables:

```json
{
  "url": "https://api.example.com/data",
  "proxy": {
    "url": "http://proxy.company.com:8080",
    "bypass": ["internal.company.com", "*.local", "192.168.1.0/24"]
  }
}
```

### NO_PROXY Pattern Matching

The `NO_PROXY` environment variable and `proxy.bypass` field support various patterns:

- **Exact domain match**: `example.com`
- **Wildcard subdomains**: `*.example.com` (matches `api.example.com`, `sub.example.com`)
- **Domain suffix**: `.example.com` (matches `api.example.com`, `sub.example.com`)
- **IP addresses**: `192.168.1.1`, `127.0.0.1`
- **Multiple patterns**: Comma-separated list

### Examples

#### Corporate Environment Setup
```bash
# Corporate proxy with authentication
export HTTPS_PROXY=http://employee:password@corporate-proxy.company.com:8080

# Bypass proxy for internal services
export NO_PROXY=*.company.com,localhost,127.0.0.1,10.0.0.0/8,192.168.0.0/16

# Start the MCP server
npm start
```

#### Tool Call with Explicit Proxy
```json
{
  "name": "fetch_json",
  "arguments": {
    "url": "https://external-api.example.com/data",
    "headers": {
      "Authorization": "Bearer token123"
    },
    "proxy": {
      "url": "http://proxy.company.com:3128",
      "bypass": ["internal.company.com", "localhost"]
    }
  }
}
```

#### Development Environment with Proxy
```bash
# Use local proxy for development
export HTTP_PROXY=http://localhost:8888
export HTTPS_PROXY=http://localhost:8888
export NO_PROXY=localhost,127.0.0.1,*.local

npm run dev
```

### Security Considerations

- **Private IP Protection**: The server blocks attempts to access private IP addresses through proxy configurations to prevent SSRF attacks
- **Protocol Validation**: Only HTTP and HTTPS proxy protocols are supported
- **URL Validation**: Proxy URLs are validated to prevent malicious configurations
- **Target URL Protection**: The existing private IP blocking for target URLs remains active even when using proxies

### Troubleshooting Proxy Issues

#### Common Error Messages

- `"Invalid proxy URL: <url>"`: The proxy URL format is incorrect or uses an unsupported protocol
- `"Failed to fetch <url> via proxy: <error>"`: The proxy server is unreachable or authentication failed
- `"Fetcher blocked an attempt to fetch a private IP"`: The target URL or proxy URL contains a private IP address

#### Debugging Steps

1. **Verify proxy connectivity**:
   ```bash
   curl -x http://proxy.company.com:8080 https://httpbin.org/ip
   ```

2. **Check environment variables**:
   ```bash
   echo $HTTP_PROXY $HTTPS_PROXY $NO_PROXY
   ```

3. **Test without proxy**:
   ```bash
   unset HTTP_PROXY HTTPS_PROXY
   npm start
   ```

4. **Validate proxy URL format**:
   - ✅ `http://proxy.example.com:8080`
   - ✅ `http://user:pass@proxy.example.com:8080`
   - ❌ `ftp://proxy.example.com:21`
   - ❌ `proxy.example.com:8080` (missing protocol)

## Features

- Fetches web content using `node-fetch` for reliable HTTP agent support
- **Enterprise proxy support** with environment variables and explicit configuration
- **Comprehensive NO_PROXY pattern matching** including wildcards and CIDR notation
- **Security-first approach** with private IP blocking and URL validation
- Supports custom headers for requests
- Provides content in multiple formats: HTML, JSON, plain text, and Markdown
- Uses JSDOM for HTML parsing and text extraction
- Uses TurndownService for HTML to Markdown conversion
- **Proxy agent caching** for optimal performance

## Technical Notes

### Why node-fetch Instead of Built-in Fetch?

This project uses the `node-fetch` package instead of Node.js's built-in `fetch` API for proxy support. Here's why:

#### Node.js Built-in Fetch Limitations
- **No Agent Support**: The built-in fetch doesn't support the `agent` option required for proxy configuration
- **Undici-based**: Uses undici internally, which has a different, more complex API for proxy setup
- **Limited Compatibility**: Doesn't work with standard Node.js HTTP agents like `HttpsProxyAgent`

#### node-fetch Advantages
- **Agent Support**: Direct support for the `agent` option in fetch requests
- **HTTP Agent Compatibility**: Works seamlessly with `HttpsProxyAgent` and other standard agents
- **Mature Ecosystem**: Extensive documentation and community support for proxy configurations
- **Simple API**: Straightforward proxy setup without complex undici configuration

#### Code Comparison

**❌ This doesn't work with built-in fetch:**
```typescript
import { HttpsProxyAgent } from 'https-proxy-agent';

const agent = new HttpsProxyAgent('http://proxy:8080');
const response = await fetch(url, {
  agent: agent  // ❌ Ignored by built-in fetch
});
```

**✅ This works with node-fetch:**
```typescript
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const agent = new HttpsProxyAgent('http://proxy:8080');
const response = await fetch(url, {
  agent: agent  // ✅ Properly handled by node-fetch
});
```

#### Alternative Approaches

If you prefer to use built-in fetch, you would need to:

1. **Use undici directly:**
   ```typescript
   import { fetch, ProxyAgent } from 'undici';
   
   const response = await fetch(url, {
     dispatcher: new ProxyAgent('http://proxy:8080')
   });
   ```

2. **Set global proxy:**
   ```typescript
   import { setGlobalDispatcher, ProxyAgent } from 'undici';
   
   setGlobalDispatcher(new ProxyAgent('http://proxy:8080'));
   // All subsequent fetch calls use the proxy
   ```

However, `node-fetch` provides the cleanest and most compatible approach for per-request proxy configuration.

## Development

- Run `npm run dev` to start the TypeScript compiler in watch mode
- Use `npm test` to run the test suite

## Debugging with VS Code

### Setup VS Code Debugging Configuration

Create a `.vscode/launch.json` file in your project root to enable debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug MCP Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dist/index.js",
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Debug MCP Server (Watch Mode)",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dist/index.js",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "restart": true,
      "runtimeExecutable": "nodemon",
      "runtimeArgs": ["--exec"]
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Debug MCP Server with Proxy",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dist/index.js",
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development",
        "HTTP_PROXY": "http://proxy.company.com:8080",
        "HTTPS_PROXY": "http://proxy.company.com:8080",
        "NO_PROXY": "localhost,127.0.0.1,*.local"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Setup VS Code Tasks

Create a `.vscode/tasks.json` file to automate build tasks:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "build",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "silent",
        "focus": false,
        "panel": "shared",
        "showReuseMessage": true,
        "clear": false
      },
      "problemMatcher": ["$tsc"]
    },
    {
      "type": "npm",
      "script": "dev",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "new",
        "showReuseMessage": true,
        "clear": false
      },
      "problemMatcher": ["$tsc-watch"]
    }
  ]
}
```

### Debugging Workflow

#### 1. Basic Debugging
1. Set breakpoints in your TypeScript source files (`src/*.ts`)
2. Press `F5` or select "Debug MCP Server" configuration
3. The debugger will build the project and start debugging

#### 2. Debugging with Proxy Configuration
1. Use the "Debug MCP Server with Proxy" configuration
2. Modify the `env` section in `launch.json` with your proxy settings
3. Set breakpoints in proxy-related code (e.g., `getProxyAgent`, `validateProxyUrl`)
4. Debug proxy logic and environment variable handling

#### 3. Debugging Tests
1. Set breakpoints in test files (`src/*.test.ts`)
2. Select "Debug Tests" configuration
3. Debug specific test cases or the entire test suite

#### 4. Watch Mode Debugging
1. Install nodemon globally: `npm install -g nodemon`
2. Use "Debug MCP Server (Watch Mode)" configuration
3. Code changes will automatically restart the debugger

### Debugging Proxy Issues

#### Common Debugging Scenarios

**1. Proxy URL Validation Issues**
```typescript
// Set breakpoint in Fetcher.ts at validateProxyUrl method
private static validateProxyUrl(proxyUrl: string): boolean {
  // Debug here to inspect proxy URL parsing
  debugger; // <-- Set breakpoint here
  try {
    const url = new URL(proxyUrl);
    // ... validation logic
  } catch {
    return false;
  }
}
```

**2. Environment Variable Detection**
```typescript
// Set breakpoint in getProxyEnvironment method
private static getProxyEnvironment(): ProxyEnvironment {
  debugger; // <-- Set breakpoint here
  return {
    httpProxy: process.env.HTTP_PROXY || process.env.http_proxy,
    httpsProxy: process.env.HTTPS_PROXY || process.env.https_proxy,
    noProxy: process.env.NO_PROXY || process.env.no_proxy,
  };
}
```

**3. NO_PROXY Pattern Matching**
```typescript
// Set breakpoint in matchesNoProxy method
private static matchesNoProxy(targetUrl: string, noProxyPatterns: string[]): boolean {
  debugger; // <-- Set breakpoint here
  try {
    const url = new URL(targetUrl);
    const hostname = url.hostname;
    // Debug pattern matching logic
  } catch {
    return false;
  }
}
```

#### Debug Console Commands

While debugging, use the VS Code Debug Console to inspect variables:

```javascript
// Check environment variables
process.env.HTTP_PROXY
process.env.HTTPS_PROXY
process.env.NO_PROXY

// Inspect proxy configuration
proxyConfig
targetUrl

// Check agent cache
this.agentCache.size
this.agentCache.keys()

// Test URL parsing
new URL("http://proxy.company.com:8080")
```

### Debugging MCP Protocol Communication

#### Enable MCP Debug Logging

Add debug logging to inspect MCP communication:

```typescript
// In index.ts, add logging
import fetch from 'node-fetch'; // For debugging fetch requests

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.debug('MCP Request:', JSON.stringify(request, null, 2));
  
  const { name, arguments: args } = request.params;
  const validatedArgs = RequestPayloadSchema.parse(args);
  
  console.debug('Validated Args:', JSON.stringify(validatedArgs, null, 2));
  console.debug('Using node-fetch with agent support:', validatedArgs.proxy ? 'Yes' : 'No');
  
  // ... rest of handler
});
```

#### Debug MCP Client Integration

When debugging with MCP clients (like Claude Desktop):

1. **Check Client Configuration**:
   ```json
   {
     "mcpServers": {
       "fetch": {
         "command": "node",
         "args": ["--inspect=9229", "/path/to/fetch-mcp/dist/index.js"]
       }
     }
   }
   ```

2. **Connect Remote Debugger**:
   - Add `"port": 9229` to your launch.json configuration
   - Use "Attach to Process" debugging mode

3. **Debug Client Communication**:
   - Set breakpoints in MCP request handlers
   - Inspect tool arguments and responses
   - Monitor proxy configuration flow

### Tips for Effective Debugging

1. **Use Conditional Breakpoints**: Right-click breakpoint → Add condition (e.g., `proxyUrl.includes('company.com')`)

2. **Watch Variables**: Add variables to Watch panel to monitor changes

3. **Call Stack Navigation**: Use Call Stack panel to trace execution flow

4. **Debug Output**: Use `console.debug()` for development logging (filtered out in production)

5. **Source Maps**: Ensure source maps are enabled for TypeScript debugging

6. **Environment Isolation**: Use different launch configurations for different proxy scenarios

## License

This project is licensed under the MIT License.