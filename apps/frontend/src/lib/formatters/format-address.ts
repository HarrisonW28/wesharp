export type AddressParts = {
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
};

export function formatAddress(parts: AddressParts): string {
  const lines = [parts.line1, parts.line2, `${parts.city}, ${parts.postcode}`].filter(Boolean);
  return lines.join("\n");
}
