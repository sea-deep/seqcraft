import { z } from 'zod';

const documentDescriptorSchema = z.object({
  id: z.string().trim().min(1).max(128),
  name: z.string().trim().min(1).max(160),
  length: z.number().int().nonnegative().max(1_000_000_000),
  alphabet: z.enum(['dna', 'rna', 'mixed', 'protein', 'unknown']),
  topology: z.enum(['linear', 'circular']),
  localStorageKey: z.string().trim().min(1).max(256),
}).strict();

export const projectMetadataInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  documents: z.array(documentDescriptorSchema).max(250),
  activeDocumentId: z.string().trim().min(1).max(128).nullable(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    activeView: z.enum(['sequence', 'map', 'features', 'primers', 'enzymes', 'history', 'compare']).optional(),
  }).strict().default({}),
}).strict().superRefine((project, context) => {
  if (project.activeDocumentId && !project.documents.some(document => document.id === project.activeDocumentId)) {
    context.addIssue({
      code: 'custom',
      path: ['activeDocumentId'],
      message: 'activeDocumentId must reference a document descriptor in this project.',
    });
  }
});

export type ProjectMetadataInput = z.infer<typeof projectMetadataInputSchema>;

export type ProjectMetadata = ProjectMetadataInput & {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export const projectIdSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
