import cheerio from 'cheerio';
import { NodeHtmlMarkdown } from 'node-html-markdown';

interface Folder {
  location: string;
  files: string[];
}

class Parser {
  private seen = new Set<string>();
  private folders: Folder[] = [];
  private queue: { location: string; depth: number }[] = [];

  constructor(private maxDepth = 2, private maxPages = 1) { }

  async parse(folderLocation: string): Promise<Folder[]> {
    // Add the start URL to the queue
    this.addToQueue(folderLocation);

    // While there are URLs in the queue and we haven't reached the maximum number of pages...
    while (this.shouldContinueCrawling()) {
      // Dequeue the next URL and depth
      const { location, depth } = this.queue.shift()!;

      // If the depth is too great or we've already seen this URL, skip it
      if (this.isTooDeep(depth) || this.isAlreadySeen(location)) continue;

      // Add the URL to the set of seen URLs
      this.seen.add(location);

      // Fetch the page HTML
      const html = await this.fetchPage(location);

      // Parse the HTML and add the page to the list of crawled pages
      this.folders.push({ location, files: [] });

      // Extract new URLs from the page HTML and add them to the queue
      this.addNewUrlsToQueue(this.extractUrls(html, location), depth);
    }

    // Return the list of crawled pages
    return this.folders;
  }

  private isTooDeep(depth: number) {
    return depth > this.maxDepth;
  }

  private isAlreadySeen(url: string) {
    return this.seen.has(url);
  }

  private shouldContinueCrawling() {
    return this.queue.length > 0 && this.folders.length < this.maxPages;
  }

  private addToQueue(location: string, depth = 0) {
    this.queue.push({ location, depth });
  }

  private addNewUrlsToQueue(folders: string[], depth: number) {
    this.queue.push(...folders.map(location => ({ location, depth: depth + 1 })));
  }

  private async fetchPage(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      return await response.text();
    } catch (error) {
      console.error(`Failed to fetch ${url}: ${error}`);
      return '';
    }
  }

  private parseHtml(html: string[]): string {
    const $ = cheerio.load(html[0]);
    $('a').removeAttr('href');
    return NodeHtmlMarkdown.translate($.html());
  }

  private extractUrls(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const relativeUrls = $('a').map((_, link) => $(link).attr('href')).get() as string[];
    return relativeUrls.map(relativeUrl => new URL(relativeUrl, baseUrl).href);
  }
}

export { Parser };
export type { Folder };
