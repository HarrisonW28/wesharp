import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders labelled action", () => {
    render(<Button type="button">Submit</Button>);
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });
});
