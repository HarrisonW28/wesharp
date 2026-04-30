export type ServiceArea = {
  id: string;
  label: string;
  region: string;
};

/** Markets referenced in marketing copy — pricing/geo rules live backend-side later */
export const SERVICE_AREAS: ServiceArea[] = [
  { id: "manchester", label: "Greater Manchester", region: "England" },
  { id: "liverpool", label: "Liverpool City Region", region: "England" },
];
