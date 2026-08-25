// Copy this folder to start a new module. Rename the folder — the folder
// name IS the module id, kebab-case, and it is stable forever because it
// appears in shared URLs (ARCHITECTURE.md §21, "Author's checklist").
import type { ModuleManifest } from '../types';

const manifest: ModuleManifest = {
  id: '_template', // TODO: rename to match the new folder name
  title: 'Template Module',
  category: 'sandbox',
  blurb: 'One sentence describing what this module shows, for the gallery card.',
  tags: [],
  timeModel: 'static', // 'static' | 'parametric' (preferred) | 'stepped' (see §12)
  dimensions: 'both', // 2 | 3 | 'both'
  schemaVersion: 1,
  level: 'algebra-based', // 'algebra-based' | 'calculus-based' | 'upper-division'
};
export default manifest;
