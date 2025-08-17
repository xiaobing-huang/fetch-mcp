import { JSDOM } from "jsdom";
import TurndownService from "turndown";
import is_ip_private from "private-ip";
import fetch from "node-fetch"
import { HttpsProxyAgent } from "https-proxy-agent";
import { RequestPayload, ProxyConfig, ProxyEnvironment } from "./types.js";

export class Fetcher {
  private static agentCache = new Map<string, HttpsProxyAgent<string>>();
  
  private static getProxyEnvironment(): ProxyEnvironment {
    return {
      httpProxy: process.env.HTTP_PROXY || process.env.http_proxy,
      httpsProxy: process.env.HTTPS_PROXY || process.env.https_proxy,
      noProxy: process.env.NO_PROXY || process.env.no_proxy,
    };
  }
  
  private static validateProxyUrl(proxyUrl: string): boolean {
    try {
      const url = new URL(proxyUrl);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return false;
      }
      // Prevent accessing private IPs through proxy configuration
      if (is_ip_private(url.hostname)) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
  
  private static matchesNoProxy(targetUrl: string, noProxyPatterns: string[]): boolean {
    try {
      const url = new URL(targetUrl);
      const hostname = url.hostname;
      
      for (const pattern of noProxyPatterns) {
        const cleanPattern = pattern.trim();
        if (!cleanPattern) continue;
        
        // Exact match
        if (hostname === cleanPattern) {
          return true;
        }
        
        // Wildcard domain match (e.g., *.example.com)
        if (cleanPattern.startsWith('*.')) {
          const domain = cleanPattern.slice(2);
          if (hostname.endsWith('.' + domain) || hostname === domain) {
            return true;
          }
        }
        
        // Simple domain suffix match (e.g., .example.com)
        if (cleanPattern.startsWith('.') && hostname.endsWith(cleanPattern)) {
          return true;
        }
        
        // CIDR notation or IP range would need additional parsing
        // For now, we'll do exact IP matching
        if (hostname === cleanPattern) {
          return true;
        }
      }
      
      return false;
    } catch {
      return false;
    }
  }
  
  private static shouldUseProxy(targetUrl: string, proxyConfig?: ProxyConfig, env?: ProxyEnvironment): boolean {
    // Check explicit proxy bypass list first
    if (proxyConfig?.bypass && this.matchesNoProxy(targetUrl, proxyConfig.bypass)) {
      return false;
    }
    
    // Check NO_PROXY environment variable
    if (env?.noProxy) {
      const noProxyPatterns = env.noProxy.split(',').map(p => p.trim());
      if (this.matchesNoProxy(targetUrl, noProxyPatterns)) {
        return false;
      }
    }
    
    return true;
  }
  
  private static getProxyAgent(targetUrl: string, proxyConfig?: ProxyConfig): HttpsProxyAgent<string> | undefined {
    const env = this.getProxyEnvironment();
    
    // Determine proxy URL: explicit config takes precedence over environment
    let proxyUrl: string | undefined;
    
    if (proxyConfig?.url) {
      proxyUrl = proxyConfig.url;
    } else {
      // Use environment variables based on target URL protocol
      const isHttps = targetUrl.startsWith('https:');
      proxyUrl = isHttps ? env.httpsProxy : env.httpProxy;
      // Fallback to HTTP_PROXY for HTTPS if HTTPS_PROXY not set
      if (isHttps && !proxyUrl) {
        proxyUrl = env.httpProxy;
      }
    }
    
    if (!proxyUrl) {
      return undefined;
    }
    
    // Validate proxy URL
    if (!this.validateProxyUrl(proxyUrl)) {
      throw new Error(`Invalid proxy URL: ${proxyUrl}`);
    }
    
    // Check if we should bypass proxy for this target
    if (!this.shouldUseProxy(targetUrl, proxyConfig, env)) {
      return undefined;
    }
    
    // Check cache first
    const cacheKey = proxyUrl;
    let agent = this.agentCache.get(cacheKey);
    
    if (!agent) {
      agent = new HttpsProxyAgent(proxyUrl);
      this.agentCache.set(cacheKey, agent);
    }
    
    return agent;
  }
  
  private static applyLengthLimits(text: string, maxLength: number, startIndex: number): string {
    if (startIndex >= text.length) {
      return "";
    }
    
    const end = Math.min(startIndex + maxLength, text.length);
    return text.substring(startIndex, end);
  }
  private static async _fetch({
    url,
    headers,
    proxy,
  }: RequestPayload): Promise<import('node-fetch').Response> {
    try {
      if (is_ip_private(url)) {
        throw new Error(
          `Fetcher blocked an attempt to fetch a private IP ${url}. This is to prevent a security vulnerability where a local MCP could fetch privileged local IPs and exfiltrate data.`,
        );
      }
      
      // Get proxy agent if needed
      const agent = this.getProxyAgent(url, proxy);
      
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          ...headers,
        },
        agent: agent,
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      return response;
    } catch (e: unknown) {
      if (e instanceof Error) {
        // Provide more specific error messages for proxy-related failures
        if (e.message.includes('proxy') || e.message.includes('ECONNREFUSED')) {
          throw new Error(`Failed to fetch ${url} via proxy: ${e.message}`);
        }
        throw new Error(`Failed to fetch ${url}: ${e.message}`);
      } else {
        throw new Error(`Failed to fetch ${url}: Unknown error`);
      }
    }
  }

  static async html(requestPayload: RequestPayload) {
    try {
      const response = await this._fetch(requestPayload);
      let html = await response.text();
      
      // Apply length limits
      html = this.applyLengthLimits(
        html, 
        requestPayload.max_length ?? 5000, 
        requestPayload.start_index ?? 0
      );
      
      return { content: [{ type: "text", text: html }], isError: false };
    } catch (error) {
      return {
        content: [{ type: "text", text: (error as Error).message }],
        isError: true,
      };
    }
  }

  static async json(requestPayload: RequestPayload) {
    try {
      const response = await this._fetch(requestPayload);
      const json = await response.json();
      let jsonString = JSON.stringify(json);
      
      // Apply length limits
      jsonString = this.applyLengthLimits(
        jsonString,
        requestPayload.max_length ?? 5000,
        requestPayload.start_index ?? 0
      );
      
      return {
        content: [{ type: "text", text: jsonString }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: (error as Error).message }],
        isError: true,
      };
    }
  }

  static async txt(requestPayload: RequestPayload) {
    try {
      const response = await this._fetch(requestPayload);
      const html = await response.text();

      const dom = new JSDOM(html);
      const document = dom.window.document;

      const scripts = document.getElementsByTagName("script");
      const styles = document.getElementsByTagName("style");
      Array.from(scripts).forEach((script) => script.remove());
      Array.from(styles).forEach((style) => style.remove());

      const text = document.body.textContent || "";
      let normalizedText = text.replace(/\s+/g, " ").trim();
      
      // Apply length limits
      normalizedText = this.applyLengthLimits(
        normalizedText,
        requestPayload.max_length ?? 5000,
        requestPayload.start_index ?? 0
      );

      return {
        content: [{ type: "text", text: normalizedText }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: (error as Error).message }],
        isError: true,
      };
    }
  }

  static async markdown(requestPayload: RequestPayload) {
    try {
      const response = await this._fetch(requestPayload);
      const html = await response.text();
      const turndownService = new TurndownService();
      let markdown = turndownService.turndown(html);
      
      // Apply length limits
      markdown = this.applyLengthLimits(
        markdown,
        requestPayload.max_length ?? 5000,
        requestPayload.start_index ?? 0
      );
      
      return { content: [{ type: "text", text: markdown }], isError: false };
    } catch (error) {
      return {
        content: [{ type: "text", text: (error as Error).message }],
        isError: true,
      };
    }
  }
}
