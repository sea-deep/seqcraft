/**
 * Canonical application limits and operational thresholds for SeqCraft.
 */

export const APP_LIMITS = {
  /** Maximum number of document snapshots retained in the undo stack per document */
  MAX_UNDO_SNAPSHOTS: 50,

  /** Maximum number of activity / WebMCP execution events retained in memory */
  MAX_ACTIVITY_EVENTS: 100,

  /** Maximum number of in silico PCR amplicons returned per simulation */
  MAX_PCR_PRODUCTS: 250,

  /** Default maximum number of CRISPR guide targets returned per scan */
  DEFAULT_CRISPR_MAX_RESULTS: 20,

  /** File size threshold in bytes above which streaming OPFS import is triggered (2 MB) */
  LARGE_FILE_THRESHOLD_BYTES: 2 * 1024 * 1024,

  /** Maximum string length of nucleotide arguments logged before truncation */
  MAX_SANITIZED_ARGUMENT_LENGTH: 80,

  /** Maximum items returned in global workspace search */
  MAX_SEARCH_RESULTS: 100,

  /** Maximum capacity of standard Opentrons 24-tube rack */
  MAX_TUBERACK_CAPACITY: 24,

  /** Default minimal ORF codon length threshold */
  DEFAULT_MIN_ORF_CODONS: 30
} as const;
