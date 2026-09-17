import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api"
});

export const getRequests = () =>
  api.get("/requests").then((response) => response.data);

export const getTickets = () =>
  api.get("/tickets").then((response) => response.data);

export const getPolicies = () =>
  api.get("/policies").then((response) => response.data);

export const getAudit = () =>
  api.get("/audit").then((response) => response.data);

export const analyzeRequest = (requestId, conversation = []) =>
  api
    .post("/agent/analyze", {
      requestId,
      conversation
    })
    .then((response) => response.data);

export const analyzeCustomRequest = (request, conversation = []) =>
  api
    .post("/agent/analyze", {
      request,
      conversation
    })
    .then((response) => response.data);
