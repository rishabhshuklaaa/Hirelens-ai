import axios from "axios";

// Centralized Axios instance for all API calls
const api = axios.create({
  baseURL: "http://localhost:8000/api/v1",
  withCredentials: true, // Crucial: Allows sending/receiving HTTP-only cookies
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;