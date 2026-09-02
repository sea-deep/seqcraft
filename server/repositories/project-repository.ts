import type { Collection, Db } from 'mongodb';
import type { ProjectMetadata, ProjectMetadataInput } from '../privacy/project-metadata.js';

export interface ProjectRepository {
  list(userId: string): Promise<ProjectMetadata[]>;
  upsert(userId: string, projectId: string, input: ProjectMetadataInput): Promise<ProjectMetadata>;
  delete(userId: string, projectId: string): Promise<boolean>;
}

export class InMemoryProjectRepository implements ProjectRepository {
  readonly #projects = new Map<string, ProjectMetadata>();

  async list(userId: string) {
    return [...this.#projects.values()]
      .filter(project => project.userId === userId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async upsert(userId: string, projectId: string, input: ProjectMetadataInput) {
    const key = `${userId}:${projectId}`;
    const previous = this.#projects.get(key);
    const now = new Date().toISOString();
    const project: ProjectMetadata = {
      ...input,
      id: projectId,
      userId,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };
    this.#projects.set(key, project);
    return project;
  }

  async delete(userId: string, projectId: string) {
    return this.#projects.delete(`${userId}:${projectId}`);
  }
}

type StoredProject = ProjectMetadata & { _id: string };

export class MongoProjectRepository implements ProjectRepository {
  readonly #collection: Collection<StoredProject>;

  constructor(db: Db) {
    this.#collection = db.collection<StoredProject>('projects');
  }

  async ensureIndexes() {
    await this.#collection.createIndex({ userId: 1, updatedAt: -1 }, { name: 'projects_by_user_updated' });
  }

  async list(userId: string) {
    const projects = await this.#collection.find({ userId }).sort({ updatedAt: -1 }).limit(250).toArray();
    return projects.map(({ _id: storageId, ...project }) => {
      void storageId;
      return project;
    });
  }

  async upsert(userId: string, projectId: string, input: ProjectMetadataInput) {
    const _id = `${userId}:${projectId}`;
    const now = new Date().toISOString();
    await this.#collection.updateOne(
      { _id, userId },
      {
        $set: { ...input, id: projectId, userId, updatedAt: now },
        $setOnInsert: { _id, createdAt: now },
      },
      { upsert: true },
    );
    const project = await this.#collection.findOne({ _id, userId });
    if (!project) throw new Error('Project metadata was not persisted.');
    const { _id: storageId, ...result } = project;
    void storageId;
    return result;
  }

  async delete(userId: string, projectId: string) {
    const result = await this.#collection.deleteOne({ _id: `${userId}:${projectId}`, userId });
    return result.deletedCount === 1;
  }
}
