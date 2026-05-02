import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge, StatusBadgeGroup } from "@/components/status/StatusBadge";

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

describe("StatusBadgeGroup", () => {
  it("renders a row of badges", () => {
    render(
      <StatusBadgeGroup>
        <StatusBadge kind="invoice" status="sent" />
        <StatusBadge kind="payment" status="succeeded" />
      </StatusBadgeGroup>,
    );
    expect(screen.getByRole("group", { name: "Status" })).toBeTruthy();
    expect(screen.getByText("Issued")).toBeTruthy();
    expect(screen.getByText("Succeeded")).toBeTruthy();
  });
});
