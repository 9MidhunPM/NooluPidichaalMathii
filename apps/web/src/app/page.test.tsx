import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import HomePage from "./page";

test("introduces the product and upload journey", () => {
  render(<HomePage />);

  expect(
    screen.getByRole("heading", {
      name: "From idiyappam to an unnecessarily serious metro.",
    }),
  ).toBeInTheDocument();
  expect(screen.getByText("Vazhi ariyille? Noolu pidichaal mathi.")).toBeVisible();
  expect(screen.getByLabelText("Upload idiyappam photo")).toBeInTheDocument();
});
