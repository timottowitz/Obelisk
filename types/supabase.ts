export interface ProjectTemplate {
  template_id: string;
  name: string;
  created_by: string | null;
  created_at: string | null;
  /** NEW **/
  default_folders: string[];   // e.g. ["Litigation/{{Name}}/Photos"]
}
