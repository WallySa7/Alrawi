// src/views/unifiedView/types.ts
// Types specific to the UnifiedView component

import { App, WorkspaceLeaf } from "obsidian";
import { VideoItem, PlaylistItem, BookItem, Benefit, FilterState, BenefitFilterState } from "../../types";
import { CONTENT_TYPE } from "./constants";
import { DataService } from "../../services/dataService";
import { AlRawiSettings } from "../../core/settings";

// Content type type
export type ContentType = typeof CONTENT_TYPE.VIDEOS | typeof CONTENT_TYPE.BOOKS | typeof CONTENT_TYPE.BENEFITS;

// Column configuration for tables
export interface ColumnConfig {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
  sortKey?: string;
}

// Sort options
export interface SortOptions {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Props for the UnifiedView component
export interface UnifiedViewProps {
  app: App;
  leaf: WorkspaceLeaf;
  plugin: any; // AlRawiPlugin
  settings: AlRawiSettings;
  dataService: DataService;
}

// Component props with children
export interface ComponentProps {
  app: App;
  plugin: any; // AlRawiPlugin
  settings: AlRawiSettings;
  dataService: DataService;
  contentType: ContentType;
  onRefresh: () => Promise<void>;
}

// Filtered data interface
export interface FilteredData {
  items: (VideoItem | PlaylistItem | BookItem | Benefit)[];
  totalItems: number;
}

// Export options
export interface ExportOptions {
  format: 'json' | 'jsonWithContent' | 'csv';
  selectedItems?: string[];
}