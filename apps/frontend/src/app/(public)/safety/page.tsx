import { MarketingArticle } from "@/components/marketing/MarketingArticle";

export default function SafetyPage() {
  return (
    <MarketingArticle
      title="Safety & compliance"
      lead="Kitchen teams hand over sharp tooling — custody, QA, and return logistics mirror how serious operators manage risk."
    >
      <ul className="list-disc space-y-2 pl-5">
        <li>Technicians coordinate access windows with on-site contacts</li>
        <li>Knives tracked through collection, workshop, sharpening, QA, and return</li>
        <li>Damage reports capture condition notes alongside audit trails</li>
      </ul>
      <p>Specific RAMS paperwork can be mirrored to your estates process — MVP focuses on coherent digital custody first.</p>
    </MarketingArticle>
  );
}
