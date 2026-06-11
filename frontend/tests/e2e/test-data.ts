import { getAdminCredentials } from "./test-data-helper";

const adminCredentials = getAdminCredentials();

export const testUsers = [
  { email: adminCredentials.email, password: adminCredentials.password },
];

export const testCompanies = [
  { id: "1", name: "TechStart Solutions", industry: "Tech" },
];

export const testContacts = [
  { id: "1", firstName: "John", lastName: "Doe", email: "redacted@example.invalid" },
];

export const testApplications = [
  { id: "1", position: "Développeur Full Stack Senior", companyId: "1" },
  { id: "2", position: "Data Scientist", companyId: "1" },
];

export const apiMocks = {
  login: {
    url: "**/api/v1/auth/login",
    response: (_req?: any) => ({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, token: "mock" }),
    }),
  },
  getApplications: {
    url: "**/api/v1/applications*",
    response: {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, applications: testApplications }),
    },
  },
  createApplication: {
    url: "**/api/v1/applications",
    response: (_req?: any) => ({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, id: "new-app" }),
    }),
  },
  getCompanies: {
    url: "**/api/v1/companies*",
    response: {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, companies: testCompanies }),
    },
  },
  createCompany: {
    url: "**/api/v1/companies",
    response: (_req?: any) => ({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, id: "new-company" }),
    }),
  },
  getContacts: {
    url: "**/api/v1/contacts*",
    response: {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, contacts: testContacts }),
    },
  },
  createContact: {
    url: "**/api/v1/contacts",
    response: (_req?: any) => ({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, id: "new-contact" }),
    }),
  },
};
