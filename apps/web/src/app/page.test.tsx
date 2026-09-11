import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import HomePage from "./page";

test("introduces the product and upload journey", () => {
  render(<HomePage />);

  expect(
    screen.getByRole("heading", {
      name: "One plate. Many platforms. Zero necessity.",
    }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Vazhi ariyille/)).toBeVisible();
  expect(screen.getByLabelText("Upload idiyappam photo")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Five departments. One overqualified breakfast." })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Actual engineering. Questionable civic priority." })).toBeVisible();
});
