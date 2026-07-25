import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import RecoveryPage from "@/app/recovery/page";
import CaregiverPage from "@/app/caregiver/page";
import HomePage from "@/app/page";
import LoginPage from "@/app/login/page";

// LoginPage navigates after auth; jsdom has no app router mounted.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
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

  it("login page has labeled fields and no axe violations", async () => {
    const { container } = render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
