import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../server/app.js';
import { loadConfig } from '../../server/config.js';
import { InMemoryProjectRepository } from '../../server/repositories/project-repository.js';

const config = loadConfig({ NODE_ENV: 'test', APP_ORIGIN: 'http://localhost:5173' });

describe('SeqCraft API privacy boundary', () => {
  it('advertises guest mode and browser-only sequence storage without secrets', async () => {
    const app = createApp({ config, projects: new InMemoryProjectRepository() });
    const response = await request(app).get('/api/config').expect(200);
    expect(response.body).toMatchObject({
      auth: { enabled: false, googleEnabled: false },
      privacy: { sequenceStorage: 'browser-only', cloudStoresSequence: false },
    });
  });

  it('keeps metadata sync unavailable rather than faking authentication', async () => {
    const app = createApp({ config, projects: new InMemoryProjectRepository() });
    const response = await request(app).get('/api/projects').expect(503);
    expect(response.body.error).toBe('AUTH_NOT_CONFIGURED');
  });

  it('persists only allow-listed document metadata', async () => {
    const app = createApp({
      config,
      projects: new InMemoryProjectRepository(),
      resolveUserId: async () => 'user-1',
    });
    const input = {
      name: 'Cloning workspace',
      documents: [{
        id: 'doc-1',
        name: 'Vector',
        length: 4_361,
        alphabet: 'dna',
        topology: 'circular',
        localStorageKey: 'opfs:doc-1',
      }],
      activeDocumentId: 'doc-1',
      preferences: { theme: 'dark', activeView: 'map' },
    };
    await request(app).put('/api/projects/project-1').send(input).expect(200);
    const response = await request(app).get('/api/projects').expect(200);
    expect(response.body.projects[0]).toMatchObject(input);
    expect(JSON.stringify(response.body)).not.toContain('ATGC');
  });

  it('rejects sequence-bearing and unknown fields', async () => {
    const app = createApp({
      config,
      projects: new InMemoryProjectRepository(),
      resolveUserId: async () => 'user-1',
    });
    const response = await request(app)
      .put('/api/projects/project-1')
      .send({ name: 'Unsafe', documents: [], activeDocumentId: null, preferences: {}, sequence: 'ATGC' })
      .expect(400);
    expect(response.body.error).toBe('INVALID_INPUT');
  });
});
