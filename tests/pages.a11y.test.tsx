import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import RecoveryPage from "@/app/recovery/page";
import CaregiverPage from "@/app/caregiver/page";
import HomePage from "@/app/page";
import { useRecoveryStore } from "@/lib/store/recovery";
import { useCaregiverStore } from "@/lib/store/caregiver";

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
  useRecoveryStore.getState().reset();
  useCaregiverStore.getState().reset();
});

describe("page-level accessibility", () => {
  it("landing page has a single main landmark and no axe violations", async () => {
    const { container } = render(<HomePage />);
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("recovery dashboard has no axe violations", async () => {
    const { container } = render(<RecoveryPage />);
    expect(screen.getByRole("main")).toBeInTheDocument();
    // Both zero-typing selectors are exposed as radiogroups.
    expect(screen.getAllByRole("radiogroup").length).toBeGreaterThanOrEqual(1);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("caregiver dashboard has no axe violations", async () => {
    const { container } = render(<CaregiverPage />);
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
