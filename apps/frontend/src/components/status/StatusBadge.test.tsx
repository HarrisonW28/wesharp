import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "@/components/status/StatusBadge";

describe("StatusBadge", () => {
  it("shows human booking label", () => {
    render(<StatusBadge kind="booking" status="confirmed" />);
    expect(screen.getByText("Confirmed")).toBeTruthy();
  });

  it("renders dash for blank status", () => {
    render(<StatusBadge kind="knife" status="   " />);
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("maps knife sharpened helper text", () => {
    render(<StatusBadge kind="knife" status="sharpened" />);
    expect(screen.getByText("Sharpened")).toBeTruthy();
  });
});
