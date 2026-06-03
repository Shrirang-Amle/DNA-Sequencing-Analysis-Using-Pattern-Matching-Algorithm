import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { getDatasetInfo } from "./services/api";

jest.mock("./services/api", () => ({
  analyzeDNA: jest.fn(),
  getDatasetInfo: jest.fn()
}));

test("renders dual dna input modes", async () => {
  getDatasetInfo.mockResolvedValue({
    name: "demo.fna",
    path: "Dataset/demo.fna",
    fileSizeHuman: "3.0 GB"
  });

  render(<App />);

  expect(screen.getByText(/dna analysis dashboard/i)).toBeInTheDocument();
  expect(screen.getByText(/small file \/ manual mode/i)).toBeInTheDocument();
  expect(screen.getByText(/large dataset mode/i)).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: /analysis history/i })).toBeInTheDocument();
  });
});
