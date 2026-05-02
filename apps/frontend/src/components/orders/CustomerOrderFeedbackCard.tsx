"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAccountApi } from "@/lib/api/use-account-api";
import { cn } from "@/lib/utils";

type Feedback = {
  id: string;
  can_submit: boolean;
  submitted_at?: string | null;
  rating?: number | null;
  comment?: string | null;
  testimonial_interested?: boolean;
};

export function CustomerOrderFeedbackCard({ orderId, feedback }: { orderId: string; feedback: Feedback | null | undefined }) {
  const api = useAccountApi();
  const qc = useQueryClient();
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [testimonialInterested, setTestimonialInterested] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      const res = await api.json<unknown>(`/api/account/orders/${orderId}/feedback`, {
        method: "POST",
        body: JSON.stringify({
          rating,
          comment: comment.trim() !== "" ? comment.trim() : undefined,
          testimonial_interested: testimonialInterested,
        }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["account-order", orderId] });
    },
  });

  if (!feedback) {
    return null;
  }

  if (feedback.submitted_at) {
    return (
      <Card className="rounded-xl lg:col-span-3" id="feedback">
        <CardHeader>
          <CardTitle className="text-base">Your feedback</CardTitle>
          <CardDescription>Thanks — we’ve recorded your response for this order.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-5 w-5",
                  feedback.rating != null && i < feedback.rating ? "fill-amber-400 text-amber-500" : "text-muted-foreground/40",
                )}
                aria-hidden
              />
            ))}
            {feedback.rating != null ? <span className="ml-2 text-muted-foreground">{feedback.rating} / 5</span> : null}
          </div>
          {feedback.comment ? <p className="whitespace-pre-wrap text-muted-foreground">{feedback.comment}</p> : null}
          {feedback.testimonial_interested ? (
            <p className="text-xs text-muted-foreground">You opted in to a possible testimonial follow-up — we’ll only use public quotes with your approval.</p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (!feedback.can_submit) {
    return null;
  }

  return (
    <Card className="rounded-xl lg:col-span-3" id="feedback">
      <CardHeader>
        <CardTitle className="text-base">How was your experience?</CardTitle>
        <CardDescription>
          Your order is complete. A quick rating helps us improve — optional comment and testimonial interest below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Rating</Label>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Button
                key={n}
                type="button"
                variant={rating === n ? "default" : "outline"}
                size="sm"
                className="min-w-10"
                onClick={() => setRating(n)}
              >
                {n}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fb-comment">Comment (optional)</Label>
          <Textarea
            id="fb-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="What went well, or what could be better?"
            className="resize-y min-h-[4.5rem]"
          />
        </div>
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="fb-testimonial"
            className="mt-1 h-4 w-4 rounded border"
            checked={testimonialInterested}
            onChange={(e) => setTestimonialInterested(e.target.checked)}
          />
          <Label htmlFor="fb-testimonial" className="text-sm font-normal leading-snug text-muted-foreground">
            I might be open to a short testimonial request later (we never publish anything without your explicit approval).
          </Label>
        </div>
        {submit.error ? <p className="text-sm text-destructive">{(submit.error as Error).message}</p> : null}
        <Button type="button" disabled={rating < 1 || submit.isPending} onClick={() => void submit.mutate()}>
          {submit.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Sending…
            </>
          ) : (
            "Submit feedback"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
