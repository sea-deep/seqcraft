import type { SequenceProvider, ResolvedSequence, ResolveOptions } from './types';
import { NcbiSequenceProvider } from './ncbi-provider';
import { EnaSequenceProvider } from './ena-provider';
import { AddgeneSequenceProvider } from './addgene-provider';

class SequenceProviderRegistry {
  private providers = new Map<string, SequenceProvider>();
  private cache = new Map<string, { result: ResolvedSequence; timestamp: number }>();
  private maxCacheEntries = 50;

  constructor() {
    this.register(new NcbiSequenceProvider());
    this.register(new EnaSequenceProvider());
    this.register(new AddgeneSequenceProvider());

    // Register convenience aliases
    const ncbi = this.providers.get('ncbi');
    if (ncbi) {
      this.providers.set('genbank', ncbi);
      this.providers.set('refseq', ncbi);
      this.providers.set('ncbi-refseq', ncbi);
    }
  }

  register(provider: SequenceProvider) {
    this.providers.set(provider.id.toLowerCase(), provider);
  }

  get(id: string): SequenceProvider | undefined {
    return this.providers.get(id.toLowerCase());
  }

  list(): SequenceProvider[] {
    // Return unique providers (skip alias duplicates)
    const unique = new Set<SequenceProvider>();
    for (const p of this.providers.values()) {
      unique.add(p);
    }
    return Array.from(unique);
  }

  async resolveWithCache(
    providerId: string,
    query: string,
    options?: ResolveOptions
  ): Promise<ResolvedSequence> {
    const provider = this.get(providerId);
    if (!provider) {
      throw new Error(`Unknown sequence provider '${providerId}'. Available providers: ${this.list().map(p => p.id).join(', ')}`);
    }

    const cleanQuery = query.trim();
    const format = options?.format || 'genbank';
    const cacheKey = `${provider.id}:${cleanQuery.toUpperCase()}:${format}`;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 1000 * 60 * 30) {
      return cached.result;
    }

    const result = await provider.resolve(cleanQuery, options);

    // Store in cache
    if (this.cache.size >= this.maxCacheEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, { result, timestamp: Date.now() });

    return result;
  }

  clearCache() {
    this.cache.clear();
  }
}

export const sequenceProviders = new SequenceProviderRegistry();
