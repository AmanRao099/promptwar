import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { CravingDial } from "@/components/recovery/CravingDial";
import { SituationTags } from "@/components/caregiver/SituationTags";
import { EmergencyOverlay } from "@/components/EmergencyOverlay";
import { BoundaryCard } from "@/components/BoundaryCard";
import { useRecoveryStore } from "@/lib/store/recovery";
import { useCaregiverStore } from "@/lib/store/caregiver";

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
  useRecoveryStore.getState().reset();
  useRecoveryStore.setState({ cravingValue: null, somaticId: null, note: "" });
  useCaregiverStore.getState().reset();
  useCaregiverStore.setState({ tagId: null, note: "" });
});

describe("CravingDial", () => {
  it("renders a radiogroup with all levels as radios", () => {
    render(<CravingDial />);
    expect(screen.getByRole("radiogroup", { name: /craving intensity/i })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
  });

  it("selecting a level updates the store and aria-checked", () => {
    render(<CravingDial />);
    const surge = screen.getByRole("radio", { name: /a surge/i });
    fireEvent.click(surge);
    expect(surge).toHaveAttribute("aria-checked", "true");
    expect(useRecoveryStore.getState().cravingValue).toBe(4);
  });

  it("has no axe accessibility violations", async () => {
    const { container } = render(<CravingDial />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("SituationTags", () => {
  it("renders all situation tags as radios and selects one", () => {
    render(<SituationTags />);
    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBeGreaterThanOrEqual(6);
    fireEvent.click(screen.getByRole("radio", { name: /they're angry at me/i }));
    expect(useCaregiverStore.getState().tagId).toBe("angry");
  });

  it("has no axe accessibility violations", async () => {
    const { container } = render(<SituationTags />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("EmergencyOverlay", () => {
  it("renders hardcoded 988 / 911 / text hotlines with tel links", () => {
    render(<EmergencyOverlay />);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /988/i })).toHaveAttribute("href", "tel:988");
    expect(screen.getByRole("link", { name: /911/i })).toHaveAttribute("href", "tel:911");
    expect(screen.getByRole("link", { name: /741741/i })).toHaveAttribute(
      "href",
      "sms:741741?&body=HOME",
    );
  });

  it("calls onDismiss when the safe button is pressed", () => {
    let dismissed = false;
    render(<EmergencyOverlay onDismiss={() => (dismissed = true)} />);
    fireEvent.click(screen.getByRole("button", { name: /i'm safe now/i }));
    expect(dismissed).toBe(true);
  });

  it("has no axe accessibility violations", async () => {
    const { container } = render(<EmergencyOverlay onDismiss={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("BoundaryCard", () => {
  it("renders the passed line", () => {
    render(
      <ul>
        <BoundaryCard line="Not today." index={0} />
      </ul>,
    );
    expect(screen.getByText(/not today/i)).toBeInTheDocument();
  });
});
