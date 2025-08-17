const { Fetcher } = require("./Fetcher");
const { JSDOM } = require("jsdom");
const TurndownService = require("turndown");

jest.mock("node-fetch", () => jest.fn());

jest.mock("jsdom");

jest.mock("turndown");

jest.mock("https-proxy-agent", () => ({
  HttpsProxyAgent: jest.fn().mockImplementation((proxyUrl) => ({
    _proxyUrl: proxyUrl,
  })),
}));

jest.mock("private-ip", () => jest.fn().mockReturnValue(false));

describe("Fetcher", () => {
  const fetch = require("node-fetch");
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    delete process.env.NO_PROXY;
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    delete process.env.no_proxy;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const mockRequest = {
    url: "https://example.com",
    headers: { "Custom-Header": "Value" },
  };

  const mockHtml = `
    <html>
      <head>
        <title>Test Page</title>
        <script>console.log('This should be removed');</script>
        <style>body { color: red; }</style>
      </head>
      <body>
        <h1>Hello World</h1>
        <p>This is a test paragraph.</p>
      </body>
    </html>
  `;

  describe("html", () => {
    it("should return the raw HTML content", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValueOnce(mockHtml),
      });

      const result = await Fetcher.html(mockRequest);
      expect(result).toEqual({
        content: [{ type: "text", text: mockHtml }],
        isError: false,
      });
  });
});

    it("should handle errors", async () => {
      fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await Fetcher.html(mockRequest);
      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Failed to fetch https://example.com: Network error",
          },
        ],
        isError: true,
      });
    });
  });

  describe("json", () => {
    it("should parse and return JSON content", async () => {
      const mockJson = { key: "value" };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockJson),
      });

      const result = await Fetcher.json(mockRequest);
      expect(result).toEqual({
        content: [{ type: "text", text: JSON.stringify(mockJson) }],
        isError: false,
      });
    });

    it("should handle errors", async () => {
      fetch.mockRejectedValueOnce(new Error("Invalid JSON"));

      const result = await Fetcher.json(mockRequest);
      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Failed to fetch https://example.com: Invalid JSON",
          },
        ],
        isError: true,
      });
    });
  });

  describe("txt", () => {
    it("should return plain text content without HTML tags, scripts, and styles", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValueOnce(mockHtml),
      });

      const mockTextContent = "Hello World This is a test paragraph.";
      // @ts-expect-error Mocking JSDOM
      (JSDOM as jest.Mock).mockImplementationOnce(() => ({
        window: {
          document: {
            body: {
              textContent: mockTextContent,
            },
            getElementsByTagName: jest.fn().mockReturnValue([]),
          },
        },
      }));

      const result = await Fetcher.txt(mockRequest);
      expect(result).toEqual({
        content: [{ type: "text", text: mockTextContent }],
        isError: false,
      });
    });

    it("should handle errors", async () => {
      fetch.mockRejectedValueOnce(new Error("Parsing error"));

      const result = await Fetcher.txt(mockRequest);
      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Failed to fetch https://example.com: Parsing error",
          },
        ],
        isError: true,
      });
    });
  });

  describe("markdown", () => {
    it("should convert HTML to markdown", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValueOnce(mockHtml),
      });

      const mockMarkdown = "# Hello World\n\nThis is a test paragraph.";
      (TurndownService as jest.Mock).mockImplementationOnce(() => ({
        turndown: jest.fn().mockReturnValueOnce(mockMarkdown),
      }));

      const result = await Fetcher.markdown(mockRequest);
      expect(result).toEqual({
        content: [{ type: "text", text: mockMarkdown }],
        isError: false,
      });
    });

    it("should handle errors", async () => {
      fetch.mockRejectedValueOnce(new Error("Conversion error"));

      const result = await Fetcher.markdown(mockRequest);
      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Failed to fetch https://example.com: Conversion error",
          },
        ],
        isError: true,
      });
    });
  });

  describe("error handling", () => {
    it("should handle non-OK responses", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await Fetcher.html(mockRequest);
      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Failed to fetch https://example.com: HTTP error: 404",
          },
        ],
        isError: true,
      });
    });

    it("should handle unknown errors", async () => {
      fetch.mockRejectedValueOnce("Unknown error");

      const result = await Fetcher.html(mockRequest);
      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Failed to fetch https://example.com: Unknown error",
          },
        ],
        isError: true,
      });
    });
  });

  describe("proxy functionality", () => {
    const { HttpsProxyAgent } = require("https-proxy-agent");

    describe("explicit proxy configuration", () => {
      it("should use explicit proxy configuration", async () => {
        const proxyConfig = {
          url: "http://proxy.example.com:8080",
        };

        fetch.mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValueOnce("test content"),
        });

        await Fetcher.html({
          url: "https://example.com",
          proxy: proxyConfig,
        });

        expect(HttpsProxyAgent).toHaveBeenCalledWith("http://proxy.example.com:8080");
        expect(fetch).toHaveBeenCalledWith(
          "https://example.com",
          expect.objectContaining({
            agent: expect.any(Object),
          })
        );
      });

      it("should bypass proxy for domains in bypass list", async () => {
        const proxyConfig = {
          url: "http://proxy.example.com:8080",
          bypass: ["example.com", "*.internal.com"],
        };

        fetch.mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValueOnce("test content"),
        });

        await Fetcher.html({
          url: "https://example.com",
          proxy: proxyConfig,
        });

        expect(HttpsProxyAgent).not.toHaveBeenCalled();
        expect(fetch).toHaveBeenCalledWith(
          "https://example.com",
          expect.not.objectContaining({
            agent: expect.any(Object),
          })
        );
      });

      it("should handle invalid proxy URLs", async () => {
        const proxyConfig = {
          url: "invalid-proxy-url",
        };

        const result = await Fetcher.html({
          url: "https://example.com",
          proxy: proxyConfig,
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Invalid proxy URL");
      });

      it("should reject proxy URLs with private IPs", async () => {
        const proxyConfig = {
          url: "http://192.168.1.1:8080",
        };

        const result = await Fetcher.html({
          url: "https://example.com",
          proxy: proxyConfig,
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Invalid proxy URL");
      });
    });

    describe("environment variable proxy configuration", () => {
      it("should use HTTPS_PROXY for HTTPS URLs", async () => {
        process.env.HTTPS_PROXY = "http://proxy.example.com:8080";

        fetch.mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValueOnce("test content"),
        });

        await Fetcher.html({
          url: "https://example.com",
        });

        expect(HttpsProxyAgent).toHaveBeenCalledWith("http://proxy.example.com:8080");
      });

      it("should use HTTP_PROXY for HTTP URLs", async () => {
        process.env.HTTP_PROXY = "http://proxy.example.com:8080";

        fetch.mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValueOnce("test content"),
        });

        await Fetcher.html({
          url: "http://example.com",
        });

        expect(HttpsProxyAgent).toHaveBeenCalledWith("http://proxy.example.com:8080");
      });

      it("should fallback to HTTP_PROXY for HTTPS when HTTPS_PROXY not set", async () => {
        process.env.HTTP_PROXY = "http://proxy.example.com:8080";

        fetch.mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValueOnce("test content"),
        });

        await Fetcher.html({
          url: "https://example.com",
        });

        expect(HttpsProxyAgent).toHaveBeenCalledWith("http://proxy.example.com:8080");
      });

      it("should respect NO_PROXY environment variable", async () => {
        process.env.HTTP_PROXY = "http://proxy.example.com:8080";
        process.env.NO_PROXY = "example.com,*.internal.com";

        fetch.mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValueOnce("test content"),
        });

        await Fetcher.html({
          url: "https://example.com",
        });

        expect(HttpsProxyAgent).not.toHaveBeenCalled();
      });

      it("should handle lowercase environment variables", async () => {
        process.env.https_proxy = "http://proxy.example.com:8080";

        fetch.mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValueOnce("test content"),
        });

        await Fetcher.html({
          url: "https://example.com",
        });

        expect(HttpsProxyAgent).toHaveBeenCalledWith("http://proxy.example.com:8080");
      });
    });

    describe("NO_PROXY pattern matching", () => {
      beforeEach(() => {
        process.env.HTTP_PROXY = "http://proxy.example.com:8080";
      });

      it("should match exact domain names", async () => {
        process.env.NO_PROXY = "example.com";

        fetch.mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValueOnce("test content"),
        });

        await Fetcher.html({ url: "https://example.com" });
        expect(HttpsProxyAgent).not.toHaveBeenCalled();
      });

      it("should match wildcard domains", async () => {
        process.env.NO_PROXY = "*.example.com";

        fetch.mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValueOnce("test content"),
        });

        await Fetcher.html({ url: "https://sub.example.com" });
        expect(HttpsProxyAgent).not.toHaveBeenCalled();
      });

      it("should match domain suffix patterns", async () => {
        process.env.NO_PROXY = ".example.com";

        fetch.mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValueOnce("test content"),
        });

        await Fetcher.html({ url: "https://sub.example.com" });
        expect(HttpsProxyAgent).not.toHaveBeenCalled();
      });

      it("should handle multiple NO_PROXY patterns", async () => {
        process.env.NO_PROXY = "example.com,*.internal.com,localhost";

        fetch.mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValueOnce("test content"),
        });

        await Fetcher.html({ url: "https://api.internal.com" });
        expect(HttpsProxyAgent).not.toHaveBeenCalled();
      });

      it("should use proxy when domain doesn't match NO_PROXY", async () => {
        process.env.NO_PROXY = "internal.com";

        fetch.mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValueOnce("test content"),
        });

        await Fetcher.html({ url: "https://external.com" });
        expect(HttpsProxyAgent).toHaveBeenCalled();
      });
    });

    describe("proxy error handling", () => {
      it("should provide specific error messages for proxy failures", async () => {
        const proxyConfig = {
          url: "http://proxy.example.com:8080",
        };

        fetch.mockRejectedValueOnce(new Error("connect ECONNREFUSED 127.0.0.1:8080"));

        const result = await Fetcher.html({
          url: "https://example.com",
          proxy: proxyConfig,
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Failed to fetch https://example.com via proxy");
      });

      it("should handle proxy authentication errors", async () => {
        const proxyConfig = {
          url: "http://user:pass@proxy.example.com:8080",
        };

        fetch.mockRejectedValueOnce(new Error("407 Proxy Authentication Required"));

        const result = await Fetcher.html({
          url: "https://example.com",
          proxy: proxyConfig,
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Failed to fetch https://example.com via proxy");
      });
    });

    describe("proxy agent caching", () => {
      it("should reuse proxy agents for the same proxy URL", async () => {
        const proxyConfig = {
          url: "http://proxy.example.com:8080",
        };

        fetch.mockResolvedValue({
          ok: true,
          text: jest.fn().mockResolvedValue("test content"),
        });

        // Make two requests with the same proxy configuration
        await Fetcher.html({ url: "https://example.com", proxy: proxyConfig });
        await Fetcher.html({ url: "https://example.org", proxy: proxyConfig });

        // HttpsProxyAgent should only be called once due to caching
        expect(HttpsProxyAgent).toHaveBeenCalledTimes(1);
      });
    });

    describe("security validation", () => {
      it("should still block private IPs in target URLs when using proxy", async () => {
        const is_ip_private = require("private-ip");
        is_ip_private.mockReturnValueOnce(true);

        const proxyConfig = {
          url: "http://proxy.example.com:8080",
        };

        const result = await Fetcher.html({
          url: "http://192.168.1.1/sensitive-data",
          proxy: proxyConfig,
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Fetcher blocked an attempt to fetch a private IP");
      });

      it("should reject proxy configurations with unsupported protocols", async () => {
        const proxyConfig = {
          url: "ftp://proxy.example.com:21",
        };

        const result = await Fetcher.html({
          url: "https://example.com",
          proxy: proxyConfig,
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Invalid proxy URL");
      });
    });
});
