import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import HomePage from "./page";

test("introduces the product and tagline", () => {
  render(<HomePage />);

  expect(
    screen.getByRole("heading", { name: "Noolu Pidichaal Mathi" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Vazhi ariyille? Noolu pidichaal mathi.")).toBeVisible();
});
