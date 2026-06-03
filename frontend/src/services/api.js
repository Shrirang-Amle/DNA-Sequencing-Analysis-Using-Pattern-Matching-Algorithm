import axios from "axios";

const BASE_URL = "http://localhost:8080/api";

export const getDatasetInfo = async () => {
  const response = await axios.get(`${BASE_URL}/dataset`);
  return response.data;
};

export const analyzeDNA = async ({ dna, pattern, mode, scanMode }) => {
  const response = await axios.post(`${BASE_URL}/analyze`, {
    dna,
    pattern,
    mode,
    scanMode
  });

  return response.data;
};
