"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiOrigin } from "@/lib/env";
import { cn } from "@/lib/utils";

type Props = {
  defaultTopic?: "general" | "trade" | "subscription" | "coverage";
  className?: string;
};

export function ContactEnquiryForm({ defaultTopic = "general", className }: Props) {
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [message, setMessage] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (apiOrigin() === "") {
      setStatus("error");
      setFeedback("Set NEXT_PUBLIC_API_ORIGIN so we can receive your message.");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch(`${apiOrigin()}/api/public/contact-enquiries`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_name: contactName.trim(),
          email: email.trim(),
          phone: phone.trim() !== "" ? phone.trim() : undefined,
          business_name: businessName.trim() !== "" ? businessName.trim() : undefined,
          message: message.trim(),
          topic: defaultTopic,
          terms_accepted: termsAccepted,
        }),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof json === "object" &&
          json !== null &&
          "error" in json &&
          typeof (json as { error?: { message?: string } }).error?.message === "string"
            ? (json as { error: { message: string } }).error.message
            : "Could not send your message.";
        setStatus("error");
        setFeedback(msg);
        return;
      }
      setStatus("success");
      setFeedback("Thanks — we’ve received your message and will reply shortly.");
      setMessage("");
      setTermsAccepted(false);
    } catch {
      setStatus("error");
      setFeedback("Network error — please try again.");
    }
  }

  if (status === "success") {
    return (
      <Alert className={cn("border-emerald-500/30 bg-emerald-500/5", className)}>
        <AlertDescription>{feedback}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form className={cn("space-y-4 rounded-xl border bg-muted/20 p-4 md:p-6", className)} onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="contact-name">Your name</Label>
          <Input id="contact-name" required value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-email">Email</Label>
          <Input id="contact-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-phone">Phone (optional)</Label>
          <Input id="contact-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="contact-business">Business / venue (optional)</Label>
          <Input id="contact-business" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="contact-message">Message</Label>
          <Textarea id="contact-message" required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
      </div>
      <label className="flex items-start gap-3 text-sm leading-relaxed">
        <input
          type="checkbox"
          className="mt-1"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          required
        />
        <span className="text-muted-foreground">I agree that WeSharp may contact me about this enquiry.</span>
      </label>
      {feedback ? (
        <Alert variant="destructive">
          <AlertDescription>{feedback}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={status === "loading"} className="rounded-lg">
        {status === "loading" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            Sending…
          </>
        ) : (
          "Send message"
        )}
      </Button>
    </form>
  );
}
